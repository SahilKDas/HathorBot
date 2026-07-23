import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('Show the Flamingo RPG command guide'),
  async execute(ctx, app) {
    const p = app.config.prefix;
    const embed = new EmbedBuilder().setColor(0xff69b4).setTitle('🦩 Flamingo RPG')
      .setDescription(`Chat to attract wild Flamingos, identify them from their hint, and grow a one-of-a-kind flock. Slash commands and \`${p}\` prefix commands both work.`)
      .addFields(
        { name: 'Collecting', value: `\`/catch name\` · \`/box [sort] [page]\`\nPrefix: \`${p}catch\`, \`${p}flamingos\`` },
        { name: 'Hathordex', value: '`/hathordex` · `/hathordex name:<species>` · `/hathordex type:<type>`' },
        { name: 'Daycare', value: '`/daycare place` · `/daycare status` · `/daycare collect` · `/daycare hatch`' },
        { name: 'Progress', value: '`/quest` · `/profile` · `/duel @trainer`' },
        { name: 'Server setup', value: '`/spawn-channel add|remove|all|list` · `/spawn-now` (Manage Server)' },
      )
      .setFooter({ text: 'Short IDs shown in /box can be used for Daycare commands.' });
    return ctx.reply({ embeds: [embed] });
  },
};
