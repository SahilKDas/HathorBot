import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { removeCreatureFromUser, resolveOwnedCreature } from '../utils/creatures.js';

export class MarketplaceService {
  constructor({ database, userService, auditService }) {
    this.database = database;
    this.users = userService;
    this.audit = auditService;
    this.locks = new Set();
  }

  #resolveListing(query, statuses = ['active', 'draft']) {
    const normalized = String(query ?? '').toLowerCase();
    const matches = this.database.market.values().filter((listing) => statuses.includes(listing.status))
      .filter((listing) => listing.id.toLowerCase() === normalized || listing.id.toLowerCase().startsWith(normalized));
    return matches.length === 1 ? matches[0] : null;
  }

  async draft(userId, creatureQuery, price) {
    const user = this.users.get(userId);
    const creature = resolveOwnedCreature(this.database, user, creatureQuery);
    if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
    if (user.daycare?.parentIds?.includes(creature.id) || user.eggs.some((egg) => egg.parentIds?.includes(creature.id))) {
      return { ok: false, reason: 'Daycare Hathors and Egg parents cannot be listed.' };
    }
    if (this.database.market.values().some((listing) => ['draft', 'active'].includes(listing.status) && listing.creatureId === creature.id)) {
      return { ok: false, reason: 'That Hathor already has a marketplace listing.' };
    }
    if (this.database.trades.values().some((trade) => trade.status === 'pending' && [trade.offeredCreatureId, trade.requestedCreatureId].includes(creature.id))) {
      return { ok: false, reason: 'That Hathor is reserved by a pending trade.' };
    }
    const amount = Math.max(1, Math.min(1_000_000_000, Math.trunc(Number(price) || 0)));
    const listing = {
      id: randomUUID(), sellerId: userId, creatureId: creature.id, price: amount,
      status: 'draft', createdAt: new Date().toISOString(),
    };
    await this.database.market.set(listing.id, listing, { flush: true });
    return { ok: true, listing, payload: this.renderListing(listing, 'Confirm this public listing?') };
  }

  renderListing(listing, title = 'Marketplace Listing') {
    const creature = this.database.creatures.get(listing.creatureId);
    const embed = new EmbedBuilder().setColor(0x00bcd4).setTitle(title)
      .setDescription(`**${creature?.species ?? 'Missing Hathor'}** · Lv.${creature?.level ?? '?'} · ${creature?.rarity ?? '?'} · ${creature?.ivPercentage ?? '?'}% IV`)
      .addFields(
        { name: 'Price', value: `🦐 **${listing.price}** Shrimp Coins`, inline: true },
        { name: 'Seller', value: `<@${listing.sellerId}>`, inline: true },
        { name: 'Listing ID', value: `\`${listing.id.slice(0, 8)}\``, inline: true },
      );
    if (listing.status === 'draft') {
      return { embeds: [embed], components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`market:publish:${listing.id}`).setLabel('Publish Listing').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`market:cancel:${listing.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger),
      )] };
    }
    return { embeds: [embed], components: [] };
  }

  browse() {
    return this.database.market.values().filter((listing) => listing.status === 'active')
      .sort((a, b) => a.price - b.price).slice(0, 20);
  }

  buyConfirmation(userId, listingQuery) {
    const listing = this.#resolveListing(listingQuery, ['active']);
    if (!listing) return { ok: false, reason: 'That active listing ID is missing or ambiguous.' };
    if (listing.sellerId === userId) return { ok: false, reason: 'You cannot buy your own listing.' };
    const payload = this.renderListing(listing, 'Confirm Marketplace Purchase');
    payload.components = [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`market:buy:${listing.id}`).setLabel(`Buy for ${listing.price}`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`market:cancelbuy:${listing.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    )];
    return { ok: true, listing, payload };
  }

  async publish(listing, userId) {
    if (listing.status !== 'draft' || listing.sellerId !== userId) return { ok: false, reason: 'That draft listing is not yours.' };
    listing.status = 'active';
    listing.publishedAt = new Date().toISOString();
    await this.database.market.set(listing.id, listing, { flush: true });
    await this.audit.record('market.list', userId, { listingId: listing.id, creatureId: listing.creatureId, price: listing.price });
    return { ok: true, listing };
  }

  async cancel(listing, userId) {
    if (!['draft', 'active'].includes(listing.status) || listing.sellerId !== userId) return { ok: false, reason: 'That listing is not yours.' };
    listing.status = 'cancelled';
    listing.cancelledAt = new Date().toISOString();
    await this.database.market.set(listing.id, listing, { flush: true });
    await this.audit.record('market.cancel', userId, { listingId: listing.id });
    return { ok: true, listing };
  }

  async buy(listing, buyerId) {
    if (listing.status !== 'active') return { ok: false, reason: 'That listing is no longer active.' };
    if (listing.sellerId === buyerId) return { ok: false, reason: 'You cannot buy your own listing.' };
    const buyer = this.users.get(buyerId);
    const seller = this.users.get(listing.sellerId);
    const creature = this.database.creatures.get(listing.creatureId);
    if (!creature || creature.ownerId !== listing.sellerId || !seller.inventory.includes(creature.id)) return { ok: false, reason: 'The seller no longer owns that Hathor.' };
    if (buyer.shrimpCoins < listing.price) return { ok: false, reason: 'You do not have enough Shrimp Coins.' };
    await this.users.update(buyerId, (user) => { user.shrimpCoins -= listing.price; user.inventory.push(creature.id); }, { flush: true });
    await this.users.update(listing.sellerId, (user) => { user.shrimpCoins += listing.price; removeCreatureFromUser(user, creature.id); }, { flush: true });
    await this.database.creatures.set(creature.id, { ...creature, ownerId: buyerId, updatedAt: new Date().toISOString() }, { flush: true });
    listing.status = 'sold';
    listing.buyerId = buyerId;
    listing.soldAt = new Date().toISOString();
    await this.database.market.set(listing.id, listing, { flush: true });
    await this.audit.record('market.buy', buyerId, { listingId: listing.id, sellerId: listing.sellerId, creatureId: creature.id, price: listing.price });
    return { ok: true, listing, creature };
  }

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('market:')) return false;
    const [, action, listingId] = interaction.customId.split(':');
    const listing = this.database.market.get(listingId);
    if (!listing) return void await interaction.reply({ content: 'That listing no longer exists.', ephemeral: true });
    if (action === 'cancelbuy') {
      await interaction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
      return true;
    }
    if (this.locks.has(listing.id)) return void await interaction.reply({ content: 'That listing is already being processed.', ephemeral: true });
    this.locks.add(listing.id);
    try {
      const result = action === 'publish' ? await this.publish(listing, interaction.user.id)
        : action === 'cancel' ? await this.cancel(listing, interaction.user.id)
          : action === 'buy' ? await this.buy(listing, interaction.user.id)
            : { ok: false, reason: 'Unknown marketplace action.' };
      if (!result.ok) return void await interaction.reply({ content: result.reason, ephemeral: true });
      if (action === 'buy') {
        await interaction.update({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Purchase Complete').setDescription(`**${result.creature.species}** joined <@${interaction.user.id}> for 🦐 ${listing.price}.`)], components: [] });
      } else if (action === 'publish') {
        await interaction.update(this.renderListing(result.listing, '✅ Marketplace Listing Published'));
      } else {
        await interaction.update({ content: 'Listing cancelled.', embeds: [], components: [] });
      }
      return true;
    } finally {
      this.locks.delete(listing.id);
    }
  }
}
