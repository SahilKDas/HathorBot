import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { removeCreatureFromUser, resolveOwnedCreature } from '../utils/creatures.js';

const TRADE_LIFETIME_MS = 10 * 60 * 1000;

export class TradeService {
  constructor({ database, userService, auditService }) {
    this.database = database;
    this.users = userService;
    this.audit = auditService;
    this.locks = new Set();
  }

  #activeCreatureLock(creatureId) {
    const marketLocked = this.database.market.values().some((listing) => listing.status === 'active' && listing.creatureId === creatureId);
    const tradeLocked = this.database.trades.values().some((trade) => trade.status === 'pending'
      && [trade.offeredCreatureId, trade.requestedCreatureId].includes(creatureId));
    return marketLocked || tradeLocked;
  }

  #inDaycare(user, creatureId) {
    return user.daycare?.parentIds?.includes(creatureId) || user.eggs.some((egg) => egg.parentIds?.includes(creatureId));
  }

  async offer({ guildId, channelId, proposerId, targetId, offeredQuery, requestedQuery = null, coins = 0 }) {
    if (proposerId === targetId) return { ok: false, reason: 'You cannot trade with yourself.' };
    const proposer = this.users.get(proposerId);
    const target = this.users.get(targetId);
    const offered = resolveOwnedCreature(this.database, proposer, offeredQuery);
    if (!offered) return { ok: false, reason: 'Your offered Hathor ID is missing or ambiguous.' };
    const requested = requestedQuery ? resolveOwnedCreature(this.database, target, requestedQuery) : null;
    if (requestedQuery && !requested) return { ok: false, reason: 'The requested Hathor ID is missing or ambiguous.' };
    if (this.#inDaycare(proposer, offered.id) || (requested && this.#inDaycare(target, requested.id))) {
      return { ok: false, reason: 'Daycare Hathors and Egg parents cannot be traded.' };
    }
    if (this.#activeCreatureLock(offered.id) || (requested && this.#activeCreatureLock(requested.id))) {
      return { ok: false, reason: 'One of those Hathors is already reserved by another trade or listing.' };
    }
    const offeredCoins = Math.max(0, Math.min(1_000_000_000, Math.trunc(Number(coins) || 0)));
    if (proposer.shrimpCoins < offeredCoins) return { ok: false, reason: 'You do not have enough Shrimp Coins for that offer.' };
    const now = Date.now();
    const trade = {
      id: randomUUID(), guildId, channelId, proposerId, targetId,
      offeredCreatureId: offered.id,
      requestedCreatureId: requested?.id ?? null,
      offeredCoins,
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TRADE_LIFETIME_MS).toISOString(),
    };
    await this.database.trades.set(trade.id, trade, { flush: true });
    await this.audit.record('trade.offer', proposerId, { tradeId: trade.id, targetId, offeredCreatureId: offered.id, requestedCreatureId: requested?.id ?? null, offeredCoins });
    return { ok: true, trade, payload: this.render(trade) };
  }

  render(trade) {
    const offered = this.database.creatures.get(trade.offeredCreatureId);
    const requested = trade.requestedCreatureId ? this.database.creatures.get(trade.requestedCreatureId) : null;
    const embed = new EmbedBuilder().setColor(trade.status === 'completed' ? 0x2ecc71 : 0xf39c12)
      .setTitle(trade.status === 'completed' ? '✅ Trade Completed' : '🤝 Trade Confirmation')
      .setDescription(`<@${trade.proposerId}> offers a trade to <@${trade.targetId}>.`)
      .addFields(
        { name: 'Offered', value: `**${offered?.species ?? 'Missing Hathor'}** · Lv.${offered?.level ?? '?'} · ${offered?.ivPercentage ?? '?'}% IV\n🦐 ${trade.offeredCoins} coins`, inline: true },
        { name: 'Requested', value: requested ? `**${requested.species}** · Lv.${requested.level} · ${requested.ivPercentage}% IV` : 'Nothing — this is a gift', inline: true },
      )
      .setFooter({ text: `Trade ${trade.id.slice(0, 8)} · Ownership is rechecked when accepted` });
    if (trade.status !== 'pending') return { embeds: [embed], components: [] };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`trade:accept:${trade.id}`).setLabel('Accept Trade').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`trade:decline:${trade.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger),
    );
    return { embeds: [embed], components: [row] };
  }

  async accept(trade, userId) {
    if (trade.status !== 'pending') return { ok: false, reason: 'That trade is no longer pending.' };
    if (trade.targetId !== userId) return { ok: false, reason: 'Only the receiving trainer can accept.' };
    if (Date.parse(trade.expiresAt) <= Date.now()) return { ok: false, reason: 'That trade offer expired.' };
    const proposer = this.users.get(trade.proposerId);
    const target = this.users.get(trade.targetId);
    const offered = resolveOwnedCreature(this.database, proposer, trade.offeredCreatureId);
    const requested = trade.requestedCreatureId ? resolveOwnedCreature(this.database, target, trade.requestedCreatureId) : null;
    if (!offered || (trade.requestedCreatureId && !requested)) return { ok: false, reason: 'Ownership changed, so this trade cannot complete.' };
    if (proposer.shrimpCoins < trade.offeredCoins) return { ok: false, reason: 'The offering trainer no longer has enough coins.' };

    await this.users.update(trade.proposerId, (user) => {
      removeCreatureFromUser(user, offered.id);
      if (requested && !user.inventory.includes(requested.id)) user.inventory.push(requested.id);
      user.shrimpCoins -= trade.offeredCoins;
    }, { flush: true });
    await this.users.update(trade.targetId, (user) => {
      if (requested) removeCreatureFromUser(user, requested.id);
      if (!user.inventory.includes(offered.id)) user.inventory.push(offered.id);
      user.shrimpCoins += trade.offeredCoins;
    }, { flush: true });
    await this.database.creatures.set(offered.id, { ...offered, ownerId: trade.targetId, updatedAt: new Date().toISOString() }, { flush: true });
    if (requested) await this.database.creatures.set(requested.id, { ...requested, ownerId: trade.proposerId, updatedAt: new Date().toISOString() }, { flush: true });
    trade.status = 'completed';
    trade.completedAt = new Date().toISOString();
    await this.database.trades.set(trade.id, trade, { flush: true });
    await this.audit.record('trade.complete', userId, { tradeId: trade.id, proposerId: trade.proposerId, targetId: trade.targetId });
    return { ok: true, trade };
  }

  async decline(trade, userId) {
    if (trade.status !== 'pending' || ![trade.proposerId, trade.targetId].includes(userId)) return { ok: false, reason: 'That pending trade is not yours.' };
    trade.status = 'declined';
    trade.declinedBy = userId;
    trade.endedAt = new Date().toISOString();
    await this.database.trades.set(trade.id, trade, { flush: true });
    await this.audit.record('trade.decline', userId, { tradeId: trade.id });
    return { ok: true, trade };
  }

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('trade:')) return false;
    const [, action, tradeId] = interaction.customId.split(':');
    const trade = this.database.trades.get(tradeId);
    if (!trade) return void await interaction.reply({ content: 'That trade no longer exists.', ephemeral: true });
    if (this.locks.has(trade.id)) return void await interaction.reply({ content: 'That trade is already being processed.', ephemeral: true });
    this.locks.add(trade.id);
    try {
      const result = action === 'accept' ? await this.accept(trade, interaction.user.id) : await this.decline(trade, interaction.user.id);
      if (!result.ok) return void await interaction.reply({ content: result.reason, ephemeral: true });
      await interaction.update(this.render(result.trade));
      return true;
    } finally {
      this.locks.delete(trade.id);
    }
  }
}
