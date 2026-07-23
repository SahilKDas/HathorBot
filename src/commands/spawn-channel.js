import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { normalizeGuild } from '../models/Guild.js';

export default {
  data: new SlashCommandBuilder().setName('spawn-channel').setDescription('Configure wild Flamingo spawn channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((command) => command.setName('add').setDescription('Allow spawns in a channel')
      .addChannelOption((option) => option.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((command) => command.setName('remove').setDescription('Remove a spawn channel')
      .addChannelOption((option) => option.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((command) => command.setName('all').setDescription('Allow spawns in every text channel'))
    .addSubcommand((command) => command.setName('list').setDescription('List configured channels')),
  async execute(ctx, app) {
    if (!ctx.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) return ctx.reply({ content: 'You need Manage Server to change spawn channels.', ephemeral: true });
    const action = ctx.subcommand('list');
    const channel = ['list', 'all'].includes(action) ? null : ctx.selectedChannel('channel', 1);
    if (!['list', 'all'].includes(action) && !channel) return ctx.reply(`Usage: ${app.config.prefix}spawn-channel ${action} #channel`);
    let updated;
    await app.database.guilds.update(ctx.guildId, (current) => {
      const guild = normalizeGuild(current, ctx.guildId, app.config.spawn.defaultChannelIds);
      if (action === 'add') {
        guild.spawnAllChannels = false;
        if (!guild.spawnChannelIds.includes(channel.id)) guild.spawnChannelIds.push(channel.id);
      }
      if (action === 'remove') {
        guild.spawnAllChannels = false;
        guild.spawnChannelIds = guild.spawnChannelIds.filter((id) => id !== channel.id);
      }
      if (action === 'all') guild.spawnAllChannels = true;
      updated = guild;
      return guild;
    }, { flush: true });
    if (action === 'add') return ctx.reply(`✅ Wild Flamingos can now appear in <#${channel.id}>.`);
    if (action === 'remove') return ctx.reply(`✅ Removed <#${channel.id}> from the spawn list.`);
    if (action === 'all') return ctx.reply('✅ Wild Flamingos can now appear in every text channel.');
    const list = updated.spawnAllChannels
      ? 'All text channels'
      : updated.spawnChannelIds.map((id) => `<#${id}>`).join(', ') || 'None (spawning is paused)';
    return ctx.reply(`**Spawn channels:** ${list}`);
  },
};
