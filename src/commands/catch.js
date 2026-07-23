import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { RARITIES } from '../data/flamingos.js';

export default {
  data: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Catch the wild Flamingo in this channel')
    .addStringOption((option) => option.setName('name').setDescription('The Flamingo’s name').setRequired(true)),
  aliases: ['c'],
  async execute(ctx, app) {
    if (!ctx.guild) return ctx.reply({ content: 'Catching only works in a server.', ephemeral: true });
    const name = ctx.isInteraction ? ctx.string('name', 0, true) : ctx.args.join(' ');
    if (!name) return ctx.reply(`Usage: ${app.config.prefix}catch <flamingo name>`);
    const result = await app.spawns.catch({ guildId: ctx.guildId, channelId: ctx.channelId, userId: ctx.userId, guessedName: name });
    if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
    const creature = result.creature;
    const forms = [creature.shiny && '✨ Shiny', creature.gigantamax && '🏔️ Gigantamax'].filter(Boolean).join(' · ') || 'Standard';
    const embed = new EmbedBuilder()
      .setColor(RARITIES[creature.rarity].color)
      .setTitle(`${creature.shiny ? '✨ ' : ''}${creature.species} was caught!`)
      .setDescription(`<@${ctx.userId}> added it to their flock and earned **25 Shrimp Coins**.`)
      .addFields(
        { name: 'Type / Rarity', value: `${creature.type} / ${creature.rarity}`, inline: true },
        { name: 'IV', value: `${creature.ivPercentage}%`, inline: true },
        { name: 'Form', value: forms, inline: true },
        { name: 'ID', value: `\`${creature.id.slice(0, 8)}\``, inline: true },
      );
    const asset = app.assets.creature(creature);
    if (asset) embed.setThumbnail(asset.attachmentUrl);
    return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
  },
};
