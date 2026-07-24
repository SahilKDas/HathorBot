import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const rarityRank = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5, Mythic: 6 };

export default {
  data: new SlashCommandBuilder()
    .setName('box')
    .setDescription('View your caught Flamingos')
    .addStringOption((option) => option.setName('sort').setDescription('Sort order').addChoices(
      { name: 'IV (highest)', value: 'iv' }, { name: 'Rarity', value: 'rarity' }, { name: 'Level', value: 'level' },
    ))
    .addIntegerOption((option) => option.setName('page').setDescription('Page number').setMinValue(1)),
  aliases: ['flamingos', 'inventory'],
  async execute(ctx, app) {
    const sort = (ctx.string('sort', 0) ?? 'iv').toLowerCase();
    const page = Math.max(1, ctx.integer('page', 1) ?? 1);
    const user = app.users.get(ctx.userId);
    const creatures = user.inventory.map((id) => app.database.creatures.get(id)).filter(Boolean);
    const comparator = sort === 'rarity'
      ? (a, b) => rarityRank[b.rarity] - rarityRank[a.rarity] || b.ivPercentage - a.ivPercentage
      : sort === 'level' ? (a, b) => b.level - a.level || b.ivPercentage - a.ivPercentage
        : (a, b) => b.ivPercentage - a.ivPercentage;
    creatures.sort(comparator);
    const totalPages = Math.max(1, Math.ceil(creatures.length / 10));
    const safePage = Math.min(page, totalPages);
    const shown = creatures.slice((safePage - 1) * 10, safePage * 10);
    const lines = shown.map((creature, index) => {
      const number = (safePage - 1) * 10 + index + 1;
      const forms = `${creature.shiny ? '✨' : ''}${creature.gigantamax ? '🏔️' : ''}`;
      return `**${number}. ${forms}${creature.species}** — Lv.${creature.level} · ${creature.type} · ${creature.rarity} · ${creature.ivPercentage}% IV · \`${creature.id.slice(0, 8)}\``;
    });
    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle(`${ctx.user.username}’s Flamingo Box`)
      .setDescription(lines.join('\n') || 'Your flock is empty. Watch for a wild spawn!')
      .setFooter({ text: `${creatures.length} Flamingo(s) · Page ${safePage}/${totalPages} · Sorted by ${sort}` });
    return ctx.reply({ embeds: [embed] });
  },
};
