import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { FLAMINGOS, RARITIES, TYPES } from '../data/flamingos.js';
import { makeHint, normalizeName } from '../utils/text.js';

const PAGE_SIZE = 6;
const rarityNames = Object.keys(RARITIES);

function titleCase(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}` : value;
}

function findSpecies(value) {
  const normalized = normalizeName(value ?? '');
  return FLAMINGOS.find((entry) => normalizeName(entry.name) === normalized) ?? null;
}

function detailEmbed(species) {
  const number = FLAMINGOS.indexOf(species) + 1;
  return new EmbedBuilder()
    .setColor(RARITIES[species.rarity].color)
    .setTitle(`#${String(number).padStart(3, '0')} — ${species.name}`)
    .setDescription(species.description)
    .addFields(
      { name: 'Type', value: species.type, inline: true },
      { name: 'Rarity', value: species.rarity, inline: true },
      { name: 'Spawn hint', value: makeHint(species.name), inline: false },
      { name: 'Base stats', value: `HP **${species.base.hp}** · ATK **${species.base.attack}** · DEF **${species.base.defense}** · SPD **${species.base.speed}**` },
    )
    .setFooter({ text: 'Every caught Flamingo also has randomized IVs and may be Shiny or Gigantamax.' });
}

export default {
  data: new SlashCommandBuilder()
    .setName('hathordex')
    .setDescription('Browse every known Flamingo species')
    .addStringOption((option) => option.setName('name').setDescription('Open one species entry'))
    .addStringOption((option) => option.setName('type').setDescription('Filter by elemental type')
      .addChoices(...TYPES.map((type) => ({ name: type, value: type }))))
    .addStringOption((option) => option.setName('rarity').setDescription('Filter by rarity')
      .addChoices(...rarityNames.map((rarity) => ({ name: rarity, value: rarity }))))
    .addIntegerOption((option) => option.setName('page').setDescription('Page number').setMinValue(1)),
  aliases: ['h', 'dex', 'bestiary'],
  async execute(ctx, app) {
    let requestedName = null;
    let type = null;
    let rarity = null;
    let page = 1;

    if (ctx.isInteraction) {
      requestedName = ctx.string('name');
      type = ctx.string('type');
      rarity = ctx.string('rarity');
      page = ctx.integer('page') ?? 1;
    } else if (ctx.args.length) {
      const exactSpecies = findSpecies(ctx.args.join(' '));
      if (exactSpecies) {
        const asset = app.assets.creature(exactSpecies.name);
        const embed = detailEmbed(exactSpecies);
        if (asset) embed.setImage(asset.attachmentUrl);
        return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
      }

      for (const argument of ctx.args) {
        if (/^\d+$/.test(argument)) page = Number.parseInt(argument, 10);
        else if (TYPES.some((entry) => entry.toLowerCase() === argument.toLowerCase())) type = titleCase(argument);
        else if (rarityNames.some((entry) => entry.toLowerCase() === argument.toLowerCase())) rarity = titleCase(argument);
        else requestedName = requestedName ? `${requestedName} ${argument}` : argument;
      }
    }

    if (requestedName) {
      const species = findSpecies(requestedName);
      if (!species) {
        return ctx.reply({
          content: `No Hathordex entry matches **${requestedName}**. Try \`${app.config.prefix}hathordex\` to browse every species.`,
          ephemeral: true,
        });
      }
      const asset = app.assets.creature(species.name);
      const embed = detailEmbed(species);
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }

    const entries = FLAMINGOS.filter((species) => (!type || species.type === type) && (!rarity || species.rarity === rarity));
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const shown = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const lines = shown.map((species) => {
      const number = FLAMINGOS.indexOf(species) + 1;
      return `**#${String(number).padStart(3, '0')} ${species.name}** — ${species.type} · ${species.rarity}\n${species.description}`;
    });
    const filters = [type && `Type: ${type}`, rarity && `Rarity: ${rarity}`].filter(Boolean).join(' · ');
    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle('🦩 The Hathordex')
      .setDescription(lines.join('\n\n') || 'No known species match those filters.')
      .setFooter({ text: `${entries.length} species · Page ${safePage}/${totalPages}${filters ? ` · ${filters}` : ''} · Use /hathordex name:<species> for details` });
    return ctx.reply({ embeds: [embed] });
  },
};
