import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { duration, progressBar } from '../utils/text.js';

function idArgument(ctx, name, prefixPosition, required = true) {
  return ctx.isInteraction ? ctx.string(name, 0, required) : ctx.args[prefixPosition];
}

export default {
  data: new SlashCommandBuilder()
    .setName('daycare')
    .setDescription('Breed two Hathors and hatch inherited offspring')
    .addSubcommand((command) => command.setName('place').setDescription('Place two Hathors in Daycare')
      .addStringOption((option) => option.setName('first').setDescription('First Hathor ID').setRequired(true))
      .addStringOption((option) => option.setName('second').setDescription('Second Hathor ID').setRequired(true)))
    .addSubcommand((command) => command.setName('status').setDescription('Check every pair and Egg'))
    .addSubcommand((command) => command.setName('collect').setDescription('Collect an Egg from a ready pair')
      .addStringOption((option) => option.setName('pair').setDescription('Pair ID when two slots are occupied')))
    .addSubcommand((command) => command.setName('hatch').setDescription('Hatch a ready Egg')
      .addStringOption((option) => option.setName('egg').setDescription('Egg ID').setRequired(true))),
  aliases: ['breed'],
  async execute(ctx, app) {
    const subcommand = ctx.subcommand('status');
    if (subcommand === 'place') {
      const first = idArgument(ctx, 'first', 1);
      const second = idArgument(ctx, 'second', 2);
      if (!first || !second) return ctx.reply(`Usage: ${app.config.prefix}daycare place <first ID> <second ID>`);
      const result = await app.breeding.place(ctx.userId, first, second);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const scene = await app.assets.daycareScene?.(...result.parents) ?? null;
      const embed = new EmbedBuilder()
        .setColor(0xff8fc7)
        .setTitle(`A pair entered Daycare slot ${result.slot}`)
        .setDescription(`**${result.parents[0].species}** and **${result.parents[1].species}** are settling in. An Egg appears after ${duration(app.config.daycare.breedMs)} or ${app.config.daycare.breedMessages} messages.`)
        .setFooter({ text: `Pair ID: ${result.daycare.id.slice(0, 8)}` });
      if (scene) embed.setImage(scene.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: scene ? [scene.attachment] : [] });
    }
    if (subcommand === 'collect') {
      const pairId = idArgument(ctx, 'pair', 1, false);
      const result = await app.breeding.collect(ctx.userId, pairId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`You collected Egg \`${result.egg.id.slice(0, 8)}\`! It hatches after ${duration(app.config.daycare.hatchMs)} or ${app.config.daycare.hatchMessages} messages.`);
    }
    if (subcommand === 'hatch') {
      const eggId = idArgument(ctx, 'egg', 1);
      if (!eggId) return ctx.reply(`Usage: ${app.config.prefix}daycare hatch <egg ID>`);
      await ctx.defer();
      const result = await app.breeding.hatch(ctx.userId, eggId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const creature = result.creature;
      const asset = await app.assets.daycareScene?.(creature) ?? app.assets.creature(creature);
      const embed = new EmbedBuilder()
        .setColor(0xff8fc7)
        .setTitle(`${creature.species} hatched!`)
        .setDescription(`It joined <@${ctx.userId}>'s flock${creature.origin === 'story-echo' ? ' from a Fractured Echo Egg' : ' with inherited traits from its parents'}.`)
        .addFields(
          { name: 'Type / Rarity', value: `${creature.type} / ${creature.rarity}`, inline: true },
          { name: 'IV', value: `${creature.ivPercentage}%`, inline: true },
          { name: 'Mutations', value: [creature.shiny && 'Shiny', creature.gigantamax && 'Gigantamax'].filter(Boolean).join(' / ') || 'None', inline: true },
          { name: 'ID', value: `\`${creature.id.slice(0, 8)}\``, inline: true },
        );
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }

    const user = app.users.get(ctx.userId);
    const daycares = app.breeding.daycarePairs(user);
    const pairText = daycares.length ? daycares.map((daycare, index) => [
      `**Slot ${index + 1}** \`${String(daycare.id ?? 'primary').slice(0, 8)}\``,
      `Parents: ${daycare.parentIds.map((id) => app.database.creatures.get(id)?.species ?? 'Unknown').join(' + ')}`,
      `Time: ${Date.now() >= Date.parse(daycare.readyAt) ? 'ready' : duration(Date.parse(daycare.readyAt) - Date.now())}`,
      `Messages: ${progressBar(daycare.messageProgress, app.config.daycare.breedMessages)} ${daycare.messageProgress}/${app.config.daycare.breedMessages}`,
    ].join('\n')).join('\n\n') : 'No pair is currently staying here.';
    const eggText = user.eggs.length ? user.eggs.map((egg) => {
      const ready = app.breeding.isEggReady(egg);
      const label = egg.origin === 'story-echo' ? 'Fractured Mythic Egg' : 'Daycare Egg';
      return `**${label}** \`${egg.id.slice(0, 8)}\` - ${ready ? '**ready to hatch**' : `${duration(Date.parse(egg.readyAt) - Date.now())} or ${egg.messageProgress}/${app.config.daycare.hatchMessages} messages`}`;
    }).join('\n') : 'No Eggs waiting.';
    const embed = new EmbedBuilder().setColor(0xff8fc7).setTitle('Flamingo Daycare')
      .setDescription(`Pair slots: **${daycares.length}/${user.daycareSlots}**`)
      .addFields({ name: 'Breeding pairs', value: pairText }, { name: `Eggs (${user.eggs.length})`, value: eggText });
    const firstParents = daycares[0]?.parentIds.map((id) => app.database.creatures.get(id)).filter(Boolean) ?? [];
    const daycareAsset = firstParents.length
      ? (await app.assets.daycareScene?.(...firstParents) ?? app.assets.daycare())
      : app.assets.daycare();
    if (daycareAsset) embed.setImage(daycareAsset.attachmentUrl);
    return ctx.reply({ embeds: [embed], files: daycareAsset ? [daycareAsset.attachment] : [] });
  },
};
