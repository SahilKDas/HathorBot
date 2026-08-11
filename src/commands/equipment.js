import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ITEMS } from '../data/items.js';

const itemChoices = Object.values(ITEMS).map((item) => ({ name: item.name, value: item.id }));

function value(ctx, name, prefixPosition) {
  return ctx.isInteraction ? ctx.string(name, 0, true) : ctx.args[prefixPosition];
}

export default {
  data: new SlashCommandBuilder()
    .setName('equipment')
    .setDescription('Buy, equip, and use Hathor items')
    .addSubcommand((command) => command.setName('shop').setDescription('Browse equipment'))
    .addSubcommand((command) => command.setName('inventory').setDescription('View your owned items'))
    .addSubcommand((command) => command.setName('buy').setDescription('Buy an item')
      .addStringOption((option) => option.setName('item').setDescription('Item').setRequired(true).addChoices(...itemChoices))
      .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity').setMinValue(1).setMaxValue(25)))
    .addSubcommand((command) => command.setName('equip').setDescription('Equip a Charm or Anklet')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID').setRequired(true))
      .addStringOption((option) => option.setName('item').setDescription('Equipment').setRequired(true).addChoices(...itemChoices.filter((choice) => ITEMS[choice.value].slot !== 'consumable'))))
    .addSubcommand((command) => command.setName('unequip').setDescription('Unequip a slot')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID').setRequired(true))
      .addStringOption((option) => option.setName('slot').setDescription('Slot').setRequired(true).addChoices(
        { name: 'Charm', value: 'charm' }, { name: 'Anklet', value: 'anklet' },
      )))
    .addSubcommand((command) => command.setName('use').setDescription('Use a consumable item')
      .addStringOption((option) => option.setName('creature').setDescription('Hathor ID').setRequired(true))
      .addStringOption((option) => option.setName('item').setDescription('Consumable').setRequired(true).addChoices(
        { name: 'Shrimp Treat', value: 'shrimp_treat' },
      ))),
  aliases: ['items', 'gear'],
  async execute(ctx, app) {
    const action = ctx.subcommand('inventory');
    if (action === 'shop') {
      const lines = Object.values(ITEMS).map((item) => `**${item.name}** — 🦐 ${item.cost}\n${item.description}`);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xf6b73c).setTitle('Hathor Equipment Shop').setDescription(lines.join('\n\n'))] });
    }
    if (action === 'inventory') {
      const user = app.users.get(ctx.userId);
      const lines = Object.entries(user.items).map(([id, count]) => `**${ITEMS[id]?.name ?? id}** ×${count}`);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xf6b73c).setTitle(`${ctx.user.username}’s Items`).setDescription(lines.join('\n') || 'No items yet. Complete quests or visit `/equipment shop`.')] });
    }
    if (action === 'buy') {
      const itemId = value(ctx, 'item', 1);
      const quantity = ctx.isInteraction ? ctx.integer('quantity', 0) ?? 1 : ctx.integer('quantity', 2) ?? 1;
      const result = await app.equipment.buy(ctx.userId, itemId, quantity);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`🛍️ Bought **${result.count}× ${result.item.name}** for **${result.total} Shrimp Coins**.`);
    }
    if (action === 'equip') {
      const result = await app.equipment.equip(ctx.userId, value(ctx, 'creature', 1), value(ctx, 'item', 2));
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`✅ Equipped **${result.item.name}** on **${result.creature.species}**${result.previousItem ? ` and returned ${result.previousItem.name}` : ''}.`);
    }
    if (action === 'unequip') {
      const result = await app.equipment.unequip(ctx.userId, value(ctx, 'creature', 1), value(ctx, 'slot', 2));
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`✅ Returned **${result.item.name}** to your item inventory.`);
    }
    if (action === 'use') {
      const result = await app.equipment.use(ctx.userId, value(ctx, 'creature', 1), value(ctx, 'item', 2));
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`🍤 **${result.progress.creature.species}** gained **${result.progress.gained} XP**${result.progress.levelsGained ? ` and reached Lv.${result.progress.creature.level}` : ''}!`);
    }
    return ctx.reply({ content: 'Choose shop, inventory, buy, equip, unequip, or use.', ephemeral: true });
  },
};
