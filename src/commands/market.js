import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('market').setDescription('Use the audited player Hathor marketplace')
    .addSubcommand((command) => command.setName('browse').setDescription('Browse active listings'))
    .addSubcommand((command) => command.setName('list').setDescription('Create a listing with confirmation')
      .addStringOption((option) => option.setName('creature').setDescription('Your Hathor ID').setRequired(true))
      .addIntegerOption((option) => option.setName('price').setDescription('Price in Shrimp Coins').setRequired(true).setMinValue(1).setMaxValue(1_000_000_000)))
    .addSubcommand((command) => command.setName('buy').setDescription('Open a purchase confirmation')
      .addStringOption((option) => option.setName('listing').setDescription('Listing ID').setRequired(true)))
    .addSubcommand((command) => command.setName('cancel').setDescription('Cancel your active listing')
      .addStringOption((option) => option.setName('listing').setDescription('Listing ID').setRequired(true))),
  aliases: ['bazaar'],
  async execute(ctx, app) {
    const action = ctx.subcommand('browse');
    if (action === 'list') {
      const creature = ctx.isInteraction ? ctx.string('creature', 0, true) : ctx.args[1];
      const price = ctx.isInteraction ? ctx.integer('price', 0) : ctx.integer('price', 2);
      const result = await app.market.draft(ctx.userId, creature, price);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(result.payload);
    }
    if (action === 'buy') {
      const listing = ctx.isInteraction ? ctx.string('listing', 0, true) : ctx.args[1];
      const result = app.market.buyConfirmation(ctx.userId, listing);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(result.payload);
    }
    if (action === 'cancel') {
      const query = ctx.isInteraction ? ctx.string('listing', 0, true) : ctx.args[1];
      const normalized = String(query ?? '').toLowerCase();
      const matches = app.database.market.values().filter((listing) => ['draft', 'active'].includes(listing.status)
        && listing.sellerId === ctx.userId && (listing.id.toLowerCase() === normalized || listing.id.toLowerCase().startsWith(normalized)));
      if (matches.length !== 1) return ctx.reply({ content: 'That listing ID is missing or ambiguous.', ephemeral: true });
      const result = await app.market.cancel(matches[0], ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply('Marketplace listing cancelled.');
    }

    const listings = app.market.browse();
    const lines = listings.map((listing) => {
      const creature = app.database.creatures.get(listing.creatureId);
      return `\`${listing.id.slice(0, 8)}\` **${creature?.species ?? 'Missing'}** · Lv.${creature?.level ?? '?'} · ${creature?.ivPercentage ?? '?'}% IV · 🦐 **${listing.price}** · <@${listing.sellerId}>`;
    });
    const embed = new EmbedBuilder().setColor(0x00bcd4).setTitle('Hathor Marketplace')
      .setDescription(lines.join('\n') || 'No active listings right now.')
      .setFooter({ text: 'Use /market buy with a short listing ID to open confirmation.' });
    return ctx.reply({ embeds: [embed] });
  },
};
