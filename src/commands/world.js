import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { duration } from '../utils/text.js';

export default {
  data: new SlashCommandBuilder()
    .setName('world')
    .setDescription('View the biome and rain environment affecting wild Hathors')
    .addStringOption((option) => option.setName('action').setDescription('View or reroll conditions').addChoices(
      { name: 'View', value: 'view' }, { name: 'Rotate (Manage Server)', value: 'rotate' },
    )),
  aliases: ['weather', 'biome', 'environment', 'climate'],
  async execute(ctx, app) {
    const action = (ctx.string('action', 0) ?? 'view').toLowerCase();
    if (action === 'rotate' && !ctx.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild)) {
      return ctx.reply({ content: 'You need Manage Server to rotate world conditions.', ephemeral: true });
    }
    const world = await app.worlds.current(ctx.guildId, { rotate: action === 'rotate' });
    const boosted = Object.entries(world.typeWeights).sort((a, b) => b[1] - a[1])
      .map(([type, weight]) => `${weight >= 1 ? '↑' : '↓'} ${type} ×${weight.toFixed(2)}`).join(' · ') || 'No elemental modifier';
    const embed = new EmbedBuilder().setColor(0x4fc3f7).setTitle('Hathor World Conditions')
      .setDescription([
        '**Biome**',
        `${world.biome.emoji} **${world.biome.name}**`,
        `*${world.biome.description}*`,
        '',
        '**Rain environment**',
        `${world.environment.emoji} **${world.environment.name}**`,
        `*${world.environment.description}*`,
      ].join('\n'))
      .addFields(
        { name: 'Spawn influence', value: boosted },
        { name: 'Changes in', value: duration(Math.max(0, Date.parse(world.expiresAt) - Date.now())), inline: true },
      )
      .setFooter({ text: 'Biome and rain environment combine to modify type and rare-tier spawn odds.' });
    return ctx.reply({ embeds: [embed] });
  },
};
