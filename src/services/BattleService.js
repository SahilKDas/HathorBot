import { randomInt, randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { movesForType, STATUS_EFFECTS, typeEffectiveness } from '../data/battle.js';
import { equippedAccuracyBonus } from '../data/items.js';

const BATTLE_LIFETIME_MS = 30 * 60 * 1000;

function percentageBar(current, maximum, size = 10) {
  const filled = Math.max(0, Math.min(size, Math.round((current / Math.max(1, maximum)) * size)));
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function activeFighter(player) {
  return player.fighters[player.activeIndex];
}

function livingFighters(player) {
  return player.fighters.filter((fighter) => fighter.hp > 0);
}

export class BattleService {
  constructor({ database, userService, teamService, questService, progressionService, auditService }) {
    this.database = database;
    this.users = userService;
    this.teams = teamService;
    this.quests = questService;
    this.progression = progressionService;
    this.audit = auditService;
    this.locks = new Set();
  }

  activeFor(userId, guildId = null) {
    return this.database.battles.values()
      .filter((battle) => ['pending', 'active'].includes(battle.status))
      .filter((battle) => !guildId || battle.guildId === guildId)
      .filter((battle) => [battle.challengerId, battle.opponentId].includes(userId))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  }

  #team(userId) {
    return this.teams.creatures(userId).slice(0, 6);
  }

  async challenge({ guildId, channelId, challengerId, opponentId }) {
    if (challengerId === opponentId) return { ok: false, reason: 'You cannot battle yourself.' };
    if (this.activeFor(challengerId, guildId) || this.activeFor(opponentId, guildId)) {
      return { ok: false, reason: 'One of those trainers already has a pending or active battle.' };
    }
    const challengerTeam = this.#team(challengerId);
    const opponentTeam = this.#team(opponentId);
    if (!challengerTeam.length || !opponentTeam.length) {
      return { ok: false, reason: 'Both trainers need at least one Hathor selected with `/team add`.' };
    }
    const now = Date.now();
    const challenger = this.users.get(challengerId);
    if (Number(challenger.cooldowns.duel) > now) return { ok: false, reason: 'Your team needs a minute before another battle.' };
    const battle = {
      id: randomUUID(),
      guildId,
      channelId,
      challengerId,
      opponentId,
      status: 'pending',
      teamIds: {
        [challengerId]: challengerTeam.map((creature) => creature.id),
        [opponentId]: opponentTeam.map((creature) => creature.id),
      },
      players: null,
      turnUserId: null,
      turnNumber: 0,
      log: [`<@${challengerId}> challenged <@${opponentId}>.`],
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + BATTLE_LIFETIME_MS).toISOString(),
    };
    await this.database.battles.set(battle.id, battle, { flush: true });
    return { ok: true, battle, payload: this.render(battle) };
  }

  #makePlayer(userId, creatureIds) {
    return {
      userId,
      activeIndex: 0,
      fighters: creatureIds.map((creatureId) => {
        const creature = this.database.creatures.get(creatureId);
        return {
          creatureId,
          hp: creature.stats.hp,
          maxHp: creature.stats.hp,
          cooldowns: {},
          statuses: [],
          guard: false,
        };
      }),
    };
  }

  #creature(fighter) {
    return this.database.creatures.get(fighter.creatureId);
  }

  #otherId(battle, userId) {
    return battle.challengerId === userId ? battle.opponentId : battle.challengerId;
  }

  #status(fighter, id) {
    return fighter.statuses.find((status) => status.id === id);
  }

  #decrementCooldowns(fighter) {
    for (const [moveId, remaining] of Object.entries(fighter.cooldowns)) {
      fighter.cooldowns[moveId] = Math.max(0, remaining - 1);
    }
  }

  #advance(player) {
    const next = player.fighters.findIndex((fighter, index) => index !== player.activeIndex && fighter.hp > 0);
    if (next < 0) return false;
    player.activeIndex = next;
    return true;
  }

  #tickStatuses(fighter, creature, battle) {
    if (this.#status(fighter, 'burned') && fighter.hp > 0) {
      const damage = Math.max(1, Math.floor(fighter.maxHp * 0.05));
      fighter.hp = Math.max(0, fighter.hp - damage);
      battle.log.push(`🔥 ${creature.species} took ${damage} burn damage.`);
    }
    for (const status of fighter.statuses) status.remaining -= 1;
    fighter.statuses = fighter.statuses.filter((status) => status.remaining > 0);
  }

  async #complete(battle, winnerId, reason = 'knockout') {
    if (battle.status === 'complete') return;
    const loserId = this.#otherId(battle, winnerId);
    battle.status = 'complete';
    battle.winnerId = winnerId;
    battle.loserId = loserId;
    battle.turnUserId = null;
    battle.endedAt = new Date().toISOString();
    battle.endReason = reason;
    battle.log.push(`🏆 <@${winnerId}> won the battle!`);
    const cooldown = Date.now() + 60_000;
    await this.users.update(winnerId, (user) => {
      user.statistics.duelWins += 1;
      user.shrimpCoins += 100;
      user.cooldowns.duel = cooldown;
    }, { flush: true });
    await this.users.update(loserId, (user) => {
      user.statistics.duelLosses += 1;
      user.shrimpCoins += 20;
      user.cooldowns.duel = cooldown;
    }, { flush: true });
    await this.quests.record(winnerId, 'duel_win');
    await this.progression.awardTeam(winnerId, 180);
    await this.progression.awardTeam(loserId, 90);
    await this.audit.record('battle.complete', winnerId, { battleId: battle.id, loserId, reason });
    await this.database.battles.set(battle.id, battle, { flush: true });
  }

  async accept(battle, userId) {
    if (battle.status !== 'pending') return { ok: false, reason: 'That challenge is no longer pending.' };
    if (battle.opponentId !== userId) return { ok: false, reason: 'Only the challenged trainer can accept.' };
    if (Date.parse(battle.expiresAt) <= Date.now()) {
      battle.status = 'expired';
      await this.database.battles.set(battle.id, battle, { flush: true });
      return { ok: false, reason: 'That challenge expired.' };
    }
    battle.status = 'active';
    battle.players = {
      [battle.challengerId]: this.#makePlayer(battle.challengerId, battle.teamIds[battle.challengerId]),
      [battle.opponentId]: this.#makePlayer(battle.opponentId, battle.teamIds[battle.opponentId]),
    };
    const firstCreature = this.#creature(activeFighter(battle.players[battle.challengerId]));
    const secondCreature = this.#creature(activeFighter(battle.players[battle.opponentId]));
    battle.turnUserId = firstCreature.stats.speed >= secondCreature.stats.speed ? battle.challengerId : battle.opponentId;
    battle.turnNumber = 1;
    battle.startedAt = new Date().toISOString();
    battle.log.push(`⚔️ ${firstCreature.species} and ${secondCreature.species} entered the arena.`);
    await this.database.battles.set(battle.id, battle, { flush: true });
    await this.audit.record('battle.accept', userId, { battleId: battle.id });
    return { ok: true, battle };
  }

  async decline(battle, userId) {
    if (battle.status !== 'pending') return { ok: false, reason: 'That challenge is no longer pending.' };
    if (![battle.challengerId, battle.opponentId].includes(userId)) return { ok: false, reason: 'That is not your challenge.' };
    battle.status = 'declined';
    battle.endedAt = new Date().toISOString();
    battle.log.push(`Challenge declined by <@${userId}>.`);
    await this.database.battles.set(battle.id, battle, { flush: true });
    await this.audit.record('battle.decline', userId, { battleId: battle.id });
    return { ok: true, battle };
  }

  async move(battle, userId, moveId) {
    if (battle.status !== 'active') return { ok: false, reason: 'That battle is not active.' };
    if (battle.turnUserId !== userId) return { ok: false, reason: 'It is not your turn.' };
    const actorPlayer = battle.players[userId];
    const targetId = this.#otherId(battle, userId);
    const targetPlayer = battle.players[targetId];
    const actor = activeFighter(actorPlayer);
    const target = activeFighter(targetPlayer);
    const actorCreature = this.#creature(actor);
    const targetCreature = this.#creature(target);
    const move = movesForType(actorCreature.type).find((entry) => entry.id === moveId);
    if (!move) return { ok: false, reason: 'That move is unavailable.' };
    if (Number(actor.cooldowns[move.id]) > 0) return { ok: false, reason: `${move.name} is cooling down for ${actor.cooldowns[move.id]} more turn(s).` };

    const frozenSkip = this.#status(actor, 'frozen') && randomInt(100) < 30;
    const paralyzedSkip = this.#status(actor, 'paralyzed') && randomInt(100) < 25;
    if (frozenSkip || paralyzedSkip) {
      battle.log.push(`${frozenSkip ? '🧊' : '⚡'} ${actorCreature.species} could not move!`);
    } else if (move.guard) {
      actor.guard = true;
      actor.cooldowns[move.id] = move.cooldown + 1;
      battle.log.push(`🛡️ ${actorCreature.species} raised a Plume Guard.`);
    } else {
      const accuracyPenalty = this.#status(actor, 'dazed') ? 15 : 0;
      const accuracy = Math.max(5, Math.min(100, move.accuracy + equippedAccuracyBonus(actorCreature.equipment) - accuracyPenalty));
      if (randomInt(100) >= accuracy) {
        battle.log.push(`💨 ${actorCreature.species}'s ${move.name} missed.`);
      } else if (move.status) {
        const definition = STATUS_EFFECTS[move.status];
        const existing = this.#status(target, move.status);
        if (existing) existing.remaining = definition.duration;
        else target.statuses.push({ id: move.status, remaining: definition.duration });
        battle.log.push(`✨ ${targetCreature.species} became ${definition.name}.`);
      } else {
        const attack = actorCreature.stats.attack * (this.#status(actor, 'burned') ? 0.85 : 1);
        const defense = Math.max(1, targetCreature.stats.defense * (this.#status(target, 'shaken') ? 0.85 : 1));
        let multiplier = typeEffectiveness(move.type, targetCreature.type);
        if (move.type === 'Electric' && this.#status(target, 'soaked')) multiplier *= 1.2;
        if (this.#status(target, 'windswept')) multiplier *= 1.15;
        if (target.guard) {
          multiplier *= 0.6;
          target.guard = false;
        }
        const variance = (90 + randomInt(16)) / 100;
        const raw = (((2 * actorCreature.level / 5 + 2) * move.power * attack / defense) / 50) + 2;
        const damage = Math.max(1, Math.floor(raw * multiplier * variance));
        target.hp = Math.max(0, target.hp - damage);
        const effectiveness = multiplier >= 1.45 ? ' Super effective!' : multiplier <= 0.7 ? ' Not very effective.' : '';
        battle.log.push(`💥 ${actorCreature.species} used ${move.name} for **${damage}** damage.${effectiveness}`);
      }
      actor.cooldowns[move.id] = move.cooldown + 1;
    }

    this.#tickStatuses(actor, actorCreature, battle);
    if (actor.hp <= 0) {
      battle.log.push(`💫 ${actorCreature.species} fainted from its status.`);
      if (!this.#advance(actorPlayer)) {
        await this.#complete(battle, targetId);
        return { ok: true, battle };
      }
    }
    if (target.hp <= 0) {
      battle.log.push(`💫 ${targetCreature.species} fainted.`);
      if (!this.#advance(targetPlayer)) {
        await this.#complete(battle, userId);
        return { ok: true, battle };
      }
      const replacement = this.#creature(activeFighter(targetPlayer));
      battle.log.push(`🔄 <@${targetId}> sent out ${replacement.species}.`);
    }

    battle.turnUserId = targetId;
    battle.turnNumber += 1;
    this.#decrementCooldowns(activeFighter(targetPlayer));
    battle.log = battle.log.slice(-12);
    await this.database.battles.set(battle.id, battle, { flush: true });
    return { ok: true, battle };
  }

  async switch(battle, userId) {
    if (battle.status !== 'active' || battle.turnUserId !== userId) return { ok: false, reason: 'It is not your turn.' };
    const player = battle.players[userId];
    const fighter = activeFighter(player);
    if (this.#status(fighter, 'rooted')) return { ok: false, reason: 'Your active Hathor is Rooted and cannot switch.' };
    if (livingFighters(player).length < 2 || !this.#advance(player)) return { ok: false, reason: 'No other conscious team member can switch in.' };
    const creature = this.#creature(activeFighter(player));
    battle.log.push(`🔄 <@${userId}> switched to ${creature.species}.`);
    battle.turnUserId = this.#otherId(battle, userId);
    battle.turnNumber += 1;
    this.#decrementCooldowns(activeFighter(battle.players[battle.turnUserId]));
    await this.database.battles.set(battle.id, battle, { flush: true });
    return { ok: true, battle };
  }

  async forfeit(battle, userId) {
    if (battle.status !== 'active' || ![battle.challengerId, battle.opponentId].includes(userId)) {
      return { ok: false, reason: 'You are not in that active battle.' };
    }
    await this.#complete(battle, this.#otherId(battle, userId), 'forfeit');
    return { ok: true, battle };
  }

  #fighterText(player) {
    const fighter = activeFighter(player);
    const creature = this.#creature(fighter);
    const statuses = fighter.statuses.map((status) => STATUS_EFFECTS[status.id]?.name).filter(Boolean).join(', ') || 'Healthy';
    return `**${creature.species}** · Lv.${creature.level} · ${creature.type}\n${percentageBar(fighter.hp, fighter.maxHp)} **${fighter.hp}/${fighter.maxHp} HP**\n${statuses} · Team ${livingFighters(player).length}/${player.fighters.length}`;
  }

  render(battle) {
    if (battle.status === 'pending') {
      const embed = new EmbedBuilder().setColor(0xff7043).setTitle('⚔️ Turn-Based Battle Challenge')
        .setDescription(`<@${battle.challengerId}> challenged <@${battle.opponentId}>.\nEach trainer will battle with up to six Hathors from \`/team\`.`)
        .setFooter({ text: 'Only the challenged trainer can accept.' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`battle:accept:${battle.id}`).setLabel('Accept Battle').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`battle:decline:${battle.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger),
      );
      return { embeds: [embed], components: [row] };
    }

    const embed = new EmbedBuilder().setColor(battle.status === 'complete' ? 0xffc107 : 0xe74c3c)
      .setTitle(battle.status === 'complete' ? '🏆 Battle Complete' : `⚔️ Hathor Battle · Turn ${battle.turnNumber}`)
      .setDescription(battle.log.slice(-6).join('\n'));
    if (battle.players) {
      embed.addFields(
        { name: `Trainer <@${battle.challengerId}>`, value: this.#fighterText(battle.players[battle.challengerId]), inline: true },
        { name: `Trainer <@${battle.opponentId}>`, value: this.#fighterText(battle.players[battle.opponentId]), inline: true },
      );
    }
    if (battle.status === 'complete') {
      embed.addFields({ name: 'Rewards', value: `<@${battle.winnerId}>: 100 coins + 180 team XP\n<@${battle.loserId}>: 20 coins + 90 team XP` });
      return { embeds: [embed], components: [] };
    }

    const player = battle.players[battle.turnUserId];
    const fighter = activeFighter(player);
    const creature = this.#creature(fighter);
    const moveRow = new ActionRowBuilder().addComponents(...movesForType(creature.type).map((move, index) => {
      const remaining = Number(fighter.cooldowns[move.id] ?? 0);
      return new ButtonBuilder()
        .setCustomId(`battle:move:${battle.id}:${move.id}`)
        .setLabel(`${move.name}${remaining ? ` [CD ${remaining}]` : ` ${move.accuracy}%`}`)
        .setStyle(index === 1 ? ButtonStyle.Primary : index === 2 ? ButtonStyle.Secondary : index === 3 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(remaining > 0);
    }));
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`battle:switch:${battle.id}`).setLabel('Switch Hathor').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`battle:forfeit:${battle.id}`).setLabel('Forfeit').setStyle(ButtonStyle.Danger),
    );
    embed.setFooter({ text: `Waiting for ${battle.turnUserId} · Moves use accuracy, cooldowns, typing, and status effects` });
    return { embeds: [embed], components: [moveRow, actionRow] };
  }

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('battle:')) return false;
    const [prefix, action, battleId, detail] = interaction.customId.split(':');
    if (prefix !== 'battle') return false;
    const battle = this.database.battles.get(battleId);
    if (!battle) {
      await interaction.reply({ content: 'That battle record no longer exists.', ephemeral: true });
      return true;
    }
    if (this.locks.has(battle.id)) {
      await interaction.reply({ content: 'That turn is already being resolved.', ephemeral: true });
      return true;
    }
    this.locks.add(battle.id);
    try {
      let result;
      if (action === 'accept') result = await this.accept(battle, interaction.user.id);
      else if (action === 'decline') result = await this.decline(battle, interaction.user.id);
      else if (action === 'move') result = await this.move(battle, interaction.user.id, detail);
      else if (action === 'switch') result = await this.switch(battle, interaction.user.id);
      else if (action === 'forfeit') result = await this.forfeit(battle, interaction.user.id);
      else result = { ok: false, reason: 'Unknown battle action.' };
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return true;
      }
      await interaction.update(this.render(result.battle));
      return true;
    } finally {
      this.locks.delete(battle.id);
    }
  }
}
