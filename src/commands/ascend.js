import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ASCENSION_SIGIL_COST } from '../services/AscensionService.js';

export default {
  data: new SlashCommandBuilder().setName('ascend').setDescription('Use Quest Sigils to unlock a Hathor’s Ascended Form')
    .addStringOption((option) => option.setName('creature').setDescription('Hathor ID from /box').setRequired(true)),
  async execute(ctx, app) {
    const query = ctx.isInteraction ? ctx.string('creature', 0, true) : ctx.args[0];
    if (!query) return ctx.reply(`Usage: ${app.config.prefix}ascend <Hathor ID>`);
    const result = await app.ascension.ascend(ctx.userId, query);
    if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
    const creature = result.creature;
    const asset = app.assets.creature(creature);
    const embed = new EmbedBuilder().setColor(0xffc107).setTitle(`🌅 ${creature.species} Ascended!`)
      .setDescription(`Quest energy transformed **${creature.species}**. Its combat stats permanently increased by 12%.`)
      .addFields(
        { name: 'Cost', value: `${ASCENSION_SIGIL_COST} Quest Sigils`, inline: true },
        { name: 'Sigils remaining', value: String(result.sigilsRemaining), inline: true },
        { name: 'Stats', value: `HP ${creature.stats.hp} · ATK ${creature.stats.attack} · DEF ${creature.stats.defense} · SPD ${creature.stats.speed}` },
      );
    if (asset) embed.setImage(asset.attachmentUrl);
    return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
  },
};
