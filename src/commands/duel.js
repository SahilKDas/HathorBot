import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('duel').setDescription('Start or manage a turn-based Hathor battle')
    .addSubcommand((command) => command.setName('challenge').setDescription('Challenge another trainer')
      .addUserOption((option) => option.setName('opponent').setDescription('Trainer to challenge').setRequired(true)))
    .addSubcommand((command) => command.setName('status').setDescription('Show your current battle'))
    .addSubcommand((command) => command.setName('forfeit').setDescription('Forfeit your current battle')),
  aliases: ['battle'],
  async execute(ctx, app) {
    const action = ctx.isInteraction ? ctx.subcommand('status') : (ctx.args[0]?.toLowerCase() === 'status' || ctx.args[0]?.toLowerCase() === 'forfeit' ? ctx.args[0].toLowerCase() : 'challenge');
    if (action === 'status') {
      const battle = app.battles.activeFor(ctx.userId, ctx.guildId);
      if (!battle) return ctx.reply({ content: 'You have no pending or active battle.', ephemeral: true });
      return ctx.reply(app.battles.render(battle));
    }
    if (action === 'forfeit') {
      const battle = app.battles.activeFor(ctx.userId, ctx.guildId);
      if (!battle || battle.status !== 'active') return ctx.reply({ content: 'You have no active battle to forfeit.', ephemeral: true });
      const result = await app.battles.forfeit(battle, ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(app.battles.render(result.battle));
    }
    const opponent = ctx.isInteraction ? ctx.selectedUser('opponent', 0) : ctx.selectedUser('opponent', 0);
    if (!opponent) return ctx.reply(`Usage: ${app.config.prefix}duel @opponent`);
    if (opponent.bot) return ctx.reply({ content: 'Bots do not keep Hathor teams.', ephemeral: true });
    const result = await app.battles.challenge({
      guildId: ctx.guildId,
      channelId: ctx.channelId,
      challengerId: ctx.userId,
      opponentId: opponent.id,
    });
    if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
    return ctx.reply(result.payload);
  },
};
