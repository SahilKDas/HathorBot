import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function creatureArgument(ctx) {
  return ctx.isInteraction ? ctx.string('creature', 0, true) : ctx.args[1];
}

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Choose and arrange a battle team of up to six Hathors')
    .addSubcommand((command) => command.setName('view').setDescription('View your current battle team'))
    .addSubcommand((command) => command.setName('add').setDescription('Add a Hathor to the team')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID from /box').setRequired(true)))
    .addSubcommand((command) => command.setName('remove').setDescription('Remove a Hathor from the team')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID from /box').setRequired(true)))
    .addSubcommand((command) => command.setName('lead').setDescription('Move a team member into the lead position')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID from /box').setRequired(true)))
    .addSubcommand((command) => command.setName('clear').setDescription('Clear the entire team')),
  aliases: ['party'],
  async execute(ctx, app) {
    const action = ctx.subcommand('view');
    if (action === 'add' || action === 'remove' || action === 'lead') {
      const query = creatureArgument(ctx);
      if (!query) return ctx.reply(`Usage: ${app.config.prefix}team ${action} <Hathor ID>`);
      const result = await app.teams[action](ctx.userId, query);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`✅ **${result.creature.species}** ${action === 'add' ? 'joined' : action === 'remove' ? 'left' : 'now leads'} your battle team.`);
    }
    if (action === 'clear') {
      await app.teams.clear(ctx.userId);
      return ctx.reply('Your battle team has been cleared.');
    }

    const creatures = app.teams.creatures(ctx.userId);
    const lines = creatures.map((creature, index) => {
      const forms = [creature.shiny && '✨', creature.gigantamax && '🏔️', creature.ascended && '🌅'].filter(Boolean).join('');
      return `**${index + 1}. ${forms}${creature.species}** — Lv.${creature.level} · ${creature.type} · ${creature.ivPercentage}% IV · \`${creature.id.slice(0, 8)}\``;
    });
    const embed = new EmbedBuilder().setColor(0xff69b4).setTitle(`${ctx.user.username}’s Battle Team`)
      .setDescription(lines.join('\n') || `No team selected. Use \`${app.config.prefix}team add <ID>\` or \`/team add\`.`)
      .setFooter({ text: `${creatures.length}/6 slots · The first Hathor is your lead` });
    return ctx.reply({ embeds: [embed] });
  },
};
