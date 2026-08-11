import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('trade').setDescription('Offer a confirmed Hathor trade')
    .addUserOption((option) => option.setName('trainer').setDescription('Trainer receiving the offer').setRequired(true))
    .addStringOption((option) => option.setName('give').setDescription('Your Hathor ID').setRequired(true))
    .addStringOption((option) => option.setName('request').setDescription('Their Hathor ID, or leave empty for a gift'))
    .addIntegerOption((option) => option.setName('coins').setDescription('Shrimp Coins included in your offer').setMinValue(0).setMaxValue(1_000_000_000)),
  async execute(ctx, app) {
    const target = ctx.selectedUser('trainer', 0);
    const offered = ctx.isInteraction ? ctx.string('give', 0, true) : ctx.args[1];
    const requested = ctx.isInteraction ? ctx.string('request', 0) : ctx.args[2] ?? null;
    const coins = ctx.isInteraction ? ctx.integer('coins', 0) ?? 0 : ctx.integer('coins', 3) ?? 0;
    if (!target || !offered) return ctx.reply(`Usage: ${app.config.prefix}trade @trainer <your ID> [their ID] [coins]`);
    if (target.bot) return ctx.reply({ content: 'Bots cannot confirm trades.', ephemeral: true });
    const result = await app.trades.offer({
      guildId: ctx.guildId,
      channelId: ctx.channelId,
      proposerId: ctx.userId,
      targetId: target.id,
      offeredQuery: offered,
      requestedQuery: requested,
      coins,
    });
    if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
    return ctx.reply(result.payload);
  },
};
