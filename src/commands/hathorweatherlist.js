import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { BIOMES, ENVIRONMENTS } from '../data/worlds.js';
import { normalizeName } from '../utils/text.js';

const PAGE_SIZE = 6;
const biomeEntries = Object.entries(BIOMES);
const environmentEntries = Object.entries(ENVIRONMENTS);

function decimal(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
}

function influence(types) {
  return Object.entries(types)
    .sort(([, first], [, second]) => second - first)
    .map(([type, weight]) => `${weight >= 1 ? '↑' : '↓'} ${type} ×${decimal(weight)}`)
    .join(' · ') || 'No elemental modifier';
}

function findEntry(value) {
  const requested = normalizeName(value ?? '');
  const biome = biomeEntries.find(([id, entry]) => normalizeName(id) === requested || normalizeName(entry.name) === requested);
  if (biome) return { category: 'biome', id: biome[0], entry: biome[1] };
  const environment = environmentEntries.find(([id, entry]) => normalizeName(id) === requested || normalizeName(entry.name) === requested);
  if (environment) return { category: 'environment', id: environment[0], entry: environment[1] };
  return null;
}

function compactLine(entry) {
  return `${entry.emoji} **${entry.name}** — ${influence(entry.types)} · Rare ×${decimal(entry.rarityBoost)}`;
}

function detailEmbed(result, prefix) {
  if (result.category === 'biome') {
    const number = biomeEntries.findIndex(([id]) => id === result.id) + 1;
    const compatible = result.entry.environments
      .map((id) => `${ENVIRONMENTS[id].emoji} ${ENVIRONMENTS[id].name}`)
      .join(' · ');
    return new EmbedBuilder()
      .setColor(0x4fc3f7)
      .setTitle(`#${String(number).padStart(2, '0')} Biome — ${result.entry.emoji} ${result.entry.name}`)
      .setDescription(result.entry.description)
      .addFields(
        { name: 'Elemental spawn influence', value: influence(result.entry.types) },
        { name: 'Rare-tier pressure', value: `×${decimal(result.entry.rarityBoost)}`, inline: true },
        { name: 'Compatible rain environments', value: compatible },
      )
      .setFooter({ text: `Biome ID: ${result.id} · ${prefix}hwl <name> opens any entry` });
  }

  const number = environmentEntries.findIndex(([id]) => id === result.id) + 1;
  const compatible = biomeEntries
    .filter(([, biome]) => biome.environments.includes(result.id))
    .map(([, biome]) => `${biome.emoji} ${biome.name}`)
    .join(' · ');
  return new EmbedBuilder()
    .setColor(0x7e57c2)
    .setTitle(`#${String(number).padStart(2, '0')} Rain environment — ${result.entry.emoji} ${result.entry.name}`)
    .setDescription(result.entry.description)
    .addFields(
      { name: 'Elemental spawn influence', value: influence(result.entry.types) },
      { name: 'Rare-tier pressure', value: `×${decimal(result.entry.rarityBoost)}`, inline: true },
      { name: `Compatible biomes (${compatible ? compatible.split(' · ').length : 0})`, value: compatible || 'None' },
    )
    .setFooter({ text: `Environment ID: ${result.id} · ${prefix}hwl <name> opens any entry` });
}

function overviewEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle('🌍 Hathor World Atlas')
    .setDescription('Every biome and rain environment. Arrows show elemental spawn boosts or suppressions; **Rare** is the component’s rare-tier pressure before biome and environment are combined.');

  for (let index = 0; index < biomeEntries.length; index += 8) {
    const group = biomeEntries.slice(index, index + 8);
    embed.addFields({
      name: `Biomes ${index + 1}–${index + group.length}`,
      value: group.map(([, entry]) => compactLine(entry)).join('\n'),
    });
  }
  embed.addFields({
    name: 'Rain environments 1–7',
    value: environmentEntries.map(([, entry]) => compactLine(entry)).join('\n'),
  });
  return embed.setFooter({ text: '24 biomes · 7 rain environments · Use /hathorweatherlist entry:<name> for full details' });
}

function catalogEmbed(category, page) {
  const entries = category === 'rain' ? environmentEntries : biomeEntries;
  const label = category === 'rain' ? 'Rain environments' : 'Biomes';
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const shown = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const lines = shown.map(([id, entry]) => {
    const compatibility = category === 'rain'
      ? `${biomeEntries.filter(([, biome]) => biome.environments.includes(id)).length} compatible biomes`
      : entry.environments.map((environmentId) => ENVIRONMENTS[environmentId].name).join(', ');
    return `${entry.emoji} **${entry.name}**\n${entry.description}\n${influence(entry.types)} · Rare ×${decimal(entry.rarityBoost)}\n*${compatibility}*`;
  });
  return new EmbedBuilder()
    .setColor(category === 'rain' ? 0x7e57c2 : 0x4fc3f7)
    .setTitle(`🌍 World Atlas — ${label}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: `${entries.length} ${label.toLowerCase()} · Page ${safePage}/${totalPages} · Use an entry name for full compatibility details` });
}

export default {
  data: new SlashCommandBuilder()
    .setName('hathorweatherlist')
    .setDescription('Browse every biome and rain environment with spawn influences')
    .addStringOption((option) => option.setName('entry').setDescription('Open one biome or rain environment'))
    .addStringOption((option) => option.setName('category').setDescription('Browse a detailed category').addChoices(
      { name: 'All overview', value: 'all' },
      { name: 'Biomes', value: 'biomes' },
      { name: 'Rain environments', value: 'rain' },
    ))
    .addIntegerOption((option) => option.setName('page').setDescription('Detailed category page').setMinValue(1)),
  aliases: ['hwl', 'weatherlist', 'worldatlas'],
  async execute(ctx, app) {
    let requestedEntry = null;
    let category = 'all';
    let page = 1;

    if (ctx.isInteraction) {
      requestedEntry = ctx.string('entry');
      category = (ctx.string('category') ?? 'all').toLowerCase();
      page = ctx.integer('page') ?? 1;
    } else if (ctx.args.length) {
      const exact = findEntry(ctx.args.join(' '));
      if (exact) return ctx.reply({ embeds: [detailEmbed(exact, app.config.prefix)] });

      const remaining = [];
      for (const argument of ctx.args) {
        const normalized = normalizeName(argument);
        if (/^\d+$/.test(argument)) page = Number.parseInt(argument, 10);
        else if (['biome', 'biomes'].includes(normalized)) category = 'biomes';
        else if (['rain', 'rains', 'environment', 'environments', 'weather'].includes(normalized)) category = 'rain';
        else if (normalized === 'all') category = 'all';
        else remaining.push(argument);
      }
      requestedEntry = remaining.join(' ') || null;
    }

    if (requestedEntry) {
      const result = findEntry(requestedEntry);
      if (!result) {
        return ctx.reply({
          content: `No world-atlas entry matches **${requestedEntry}**. Try \`${app.config.prefix}hwl\` for the complete list.`,
          ephemeral: true,
        });
      }
      return ctx.reply({ embeds: [detailEmbed(result, app.config.prefix)] });
    }

    return ctx.reply({ embeds: [category === 'all' ? overviewEmbed() : catalogEmbed(category, page)] });
  },
};
