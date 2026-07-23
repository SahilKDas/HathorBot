import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { duration, progressBar } from '../utils/text.js';

function idArgument(ctx, name, prefixPosition) {
  return ctx.isInteraction ? ctx.string(name, 0, true) : ctx.args[prefixPosition];
}

export default {
  data: new SlashCommandBuilder()
    .setName('daycare')
    .setDescription('Breed two Flamingos and hatch inherited offspring')
    .addSubcommand((command) => command.setName('place').setDescription('Place two Flamingos in Daycare')
      .addStringOption((option) => option.setName('first').setDescription('First Flamingo ID').setRequired(true))
      .addStringOption((option) => option.setName('second').setDescription('Second Flamingo ID').setRequired(true)))
    .addSubcommand((command) => command.setName('status').setDescription('Check your pair and Eggs'))
    .addSubcommand((command) => command.setName('collect').setDescription('Collect a ready Egg'))
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
      return ctx.reply(`💞 **${result.parents[0].species}** and **${result.parents[1].species}** are settling into Daycare. An Egg appears after ${duration(app.config.daycare.breedMs)} or ${app.config.daycare.breedMessages} messages.`);
    }
    if (subcommand === 'collect') {
      const result = await app.breeding.collect(ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`🥚 You collected Egg \`${result.egg.id.slice(0, 8)}\`! It hatches after ${duration(app.config.daycare.hatchMs)} or ${app.config.daycare.hatchMessages} messages.`);
    }
    if (subcommand === 'hatch') {
      const eggId = idArgument(ctx, 'egg', 1);
      if (!eggId) return ctx.reply(`Usage: ${app.config.prefix}daycare hatch <egg ID>`);
      await ctx.defer();
      const result = await app.breeding.hatch(ctx.userId, eggId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const creature = result.creature;
      const asset = app.assets.creature(creature);
      const embed = new EmbedBuilder()
        .setColor(0xff8fc7)
        .setTitle(`🥚 ${creature.species} hatched!`)
        .setDescription(`It inherited traits from its parents and joined <@${ctx.userId}>’s flock.`)
        .addFields(
          { name: 'Type / Rarity', value: `${creature.type} / ${creature.rarity}`, inline: true },
          { name: 'IV', value: `${creature.ivPercentage}%`, inline: true },
          { name: 'Mutations', value: [creature.shiny && '✨ Shiny', creature.gigantamax && '🏔️ Gigantamax'].filter(Boolean).join(' · ') || 'None', inline: true },
          { name: 'ID', value: `\`${creature.id.slice(0, 8)}\``, inline: true },
        );
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }

    const user = app.users.get(ctx.userId);
    const daycare = user.daycare;
    const pairText = daycare ? [
      `Parents: ${daycare.parentIds.map((id) => app.database.creatures.get(id)?.species ?? 'Unknown').join(' + ')}`,
      `Time: ${Date.now() >= Date.parse(daycare.readyAt) ? '✅ ready' : duration(Date.parse(daycare.readyAt) - Date.now())}`,
      `Messages: ${progressBar(daycare.messageProgress, app.config.daycare.breedMessages)} ${daycare.messageProgress}/${app.config.daycare.breedMessages}`,
    ].join('\n') : 'No pair is currently staying here.';
    const eggText = user.eggs.length ? user.eggs.map((egg) => {
      const ready = app.breeding.isEggReady(egg);
      return `🥚 \`${egg.id.slice(0, 8)}\` — ${ready ? '**ready to hatch**' : `${duration(Date.parse(egg.readyAt) - Date.now())} or ${egg.messageProgress}/${app.config.daycare.hatchMessages} messages`}`;
    }).join('\n') : 'No Eggs waiting.';
    const embed = new EmbedBuilder().setColor(0xff8fc7).setTitle('Flamingo Daycare')
      .addFields({ name: 'Breeding pair', value: pairText }, { name: `Eggs (${user.eggs.length})`, value: eggText });
    const daycareAsset = app.assets.daycare();
    if (daycareAsset) embed.setImage(daycareAsset.attachmentUrl);
    return ctx.reply({ embeds: [embed], files: daycareAsset ? [daycareAsset.attachment] : [] });
  },
};
