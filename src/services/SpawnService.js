import { EmbedBuilder } from 'discord.js';
import { RARITIES } from '../data/flamingos.js';
import { normalizeGuild } from '../models/Guild.js';
import { createSpawn, spawnKey } from '../models/Spawn.js';
import { generateWildCreature } from './CreatureFactory.js';
import { int } from '../utils/random.js';
import { makeHint, normalizeName } from '../utils/text.js';

const SPAWN_LIFETIME_MS = 15 * 60 * 1000;

export class SpawnService {
  constructor({ database, config, assetService, userService, questService }) {
    this.database = database;
    this.config = config;
    this.assets = assetService;
    this.users = userService;
    this.quests = questService;
    this.channelLocks = new Set();
  }

  isAllowedChannel(guild, channelId) {
    return guild.spawnAllChannels || guild.spawnChannelIds.includes(channelId);
  }

  async noteMessage(message) {
    if (!message.guild || message.author.bot || !message.channel?.isTextBased()) return;
    const guildId = message.guild.id;
    let shouldSpawn = false;
    await this.database.guilds.update(guildId, (current) => {
      const guild = normalizeGuild(current, guildId, this.config.spawn.defaultChannelIds);
      if (!this.isAllowedChannel(guild, message.channel.id)) return guild;
      guild.activity.target ??= int(this.config.spawn.minMessages, this.config.spawn.maxMessages);
      guild.activity.count += 1;
      if (guild.activity.count >= guild.activity.target) {
        shouldSpawn = true;
        guild.activity.count = 0;
        guild.activity.target = int(this.config.spawn.minMessages, this.config.spawn.maxMessages);
      }
      return guild;
    });
    if (shouldSpawn) await this.spawn(message.channel);
  }

  async spawn(channel) {
    const key = spawnKey(channel.guild.id, channel.id);
    if (this.channelLocks.has(key)) return null;
    this.channelLocks.add(key);
    try {
      const existing = this.database.spawns.get(key);
      if (existing?.status === 'active' && Date.parse(existing.expiresAt) > Date.now()) return existing;

      const creature = generateWildCreature();
      const creatureAsset = this.assets.creature(creature);
      creature.imageAsset = creatureAsset ? `hathors/${creature.species.toLowerCase()}.png` : null;

      const spawn = createSpawn({
        guildId: channel.guild.id,
        channelId: channel.id,
        creature,
        expiresAt: Date.now() + SPAWN_LIFETIME_MS,
      });
      await this.database.spawns.set(key, spawn, { flush: true });

      const form = [creature.shiny && '✨ Shiny', creature.gigantamax && '🏔️ Gigantamax'].filter(Boolean).join(' · ');
      const embed = new EmbedBuilder()
        .setColor(RARITIES[creature.rarity].color)
        .setTitle('A wild Flamingo appeared!')
        .setDescription([
          `**Hint:** ${makeHint(creature.species)}`,
          `**Aura:** ${creature.rarity} · ${creature.type}${form ? ` · ${form}` : ''}`,
          '',
          `Catch it with \`${this.config.prefix}catch <name>\` or \`/catch\`.`,
        ].join('\n'))
        .setFooter({ text: 'It will wander away in 15 minutes.' })
        .setTimestamp();
      if (creatureAsset) embed.setImage(creatureAsset.attachmentUrl);
      else embed.addFields({ name: 'Image unavailable', value: 'This species asset is missing, but the Flamingo can still be caught.' });

      await channel.send({ embeds: [embed], files: creatureAsset ? [creatureAsset.attachment] : [] });
      return spawn;
    } finally {
      this.channelLocks.delete(key);
    }
  }

  async catch({ guildId, channelId, userId, guessedName }) {
    const key = spawnKey(guildId, channelId);
    if (this.channelLocks.has(key)) return { ok: false, reason: 'Someone else is already throwing a net!' };
    this.channelLocks.add(key);
    try {
      const spawn = this.database.spawns.get(key);
      if (!spawn || spawn.status !== 'active') return { ok: false, reason: 'There is no wild Flamingo in this channel.' };
      if (Date.parse(spawn.expiresAt) <= Date.now()) {
        spawn.status = 'expired';
        await this.database.spawns.set(key, spawn, { flush: true });
        return { ok: false, reason: 'That Flamingo has already wandered away.' };
      }
      if (normalizeName(guessedName) !== normalizeName(spawn.creature.species)) {
        return { ok: false, reason: 'That is not this Flamingo’s name. Try the hint again!' };
      }

      const creature = { ...spawn.creature, ownerId: userId, caughtAt: new Date().toISOString() };
      await this.database.creatures.set(creature.id, creature, { flush: true });
      await this.users.update(userId, (user) => {
        if (!user.inventory.includes(creature.id)) user.inventory.push(creature.id);
        user.statistics.catches += 1;
        user.shrimpCoins += 25;
      }, { flush: true });
      spawn.status = 'caught';
      spawn.claimedBy = userId;
      spawn.claimedAt = new Date().toISOString();
      await this.database.spawns.set(key, spawn, { flush: true });
      await this.quests.record(userId, 'catch', creature);
      return { ok: true, creature };
    } finally {
      this.channelLocks.delete(key);
    }
  }
}
