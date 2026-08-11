import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { COMMAND_GUIDE, findCommandGuide } from '../data/commandGuide.js';

const commandChoices = COMMAND_GUIDE.map((entry) => ({ name: `/${entry.name} - ${entry.summary}`, value: entry.name }));

function prefixed(value, prefix) {
  return value.replaceAll('{p}', prefix);
}

function guideValue(entry, prefix) {
  const slash = entry.slash.map((usage) => `\`${usage}\``).join(' | ');
  const prefixUsage = entry.prefix.map((usage) => `\`${prefixed(usage, prefix)}\``).join(' | ');
  const aliases = entry.aliases.length
    ? `\n**Aliases:** ${entry.aliases.map((alias) => `\`${prefix}${alias}\``).join(', ')}`
    : '';
  return `**Slash:** ${slash}\n**Prefix:** ${prefixUsage}${aliases}\n${entry.details}`;
}

function detailEmbed(entry, prefix) {
  return new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle(`/${entry.name} - ${entry.summary}`)
    .setDescription(guideValue(entry, prefix))
    .addFields({ name: 'Category', value: entry.category, inline: true })
    .setFooter({ text: 'Arguments in <angle brackets> are required; [square brackets] are optional. Prefix input is case-insensitive.' });
}

function embedCharacters(embed) {
  const data = embed.toJSON();
  return (data.title?.length ?? 0) + (data.description?.length ?? 0) + (data.footer?.text.length ?? 0)
    + (data.fields ?? []).reduce((total, field) => total + field.name.length + field.value.length, 0);
}

function messagePages(embeds) {
  const pages = [];
  let page = [];
  let characters = 0;
  for (const embed of embeds) {
    const size = embedCharacters(embed);
    if (page.length && (characters + size > 5_800 || page.length >= 10)) {
      pages.push(page);
      page = [];
      characters = 0;
    }
    page.push(embed);
    characters += size;
  }
  if (page.length) pages.push(page);
  return pages;
}

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('Show the complete Hathor RPG command guide')
    .addStringOption((option) => option.setName('command').setDescription('Open a detailed guide for one command')
      .addChoices(...commandChoices)),
  async execute(ctx, app) {
    const prefix = app.config.prefix;
    const requested = ctx.isInteraction ? ctx.string('command') : ctx.args[0];
    if (requested) {
      const entry = findCommandGuide(requested);
      if (!entry) {
        return ctx.reply({
          content: `No command or alias matches **${requested}**. Use \`${prefix}help\` for the full guide.`,
          ephemeral: true,
        });
      }
      return ctx.reply({ embeds: [detailEmbed(entry, prefix)] });
    }

    const categories = [...new Set(COMMAND_GUIDE.map((entry) => entry.category))];
    const embeds = categories.map((category, index) => {
      const embed = new EmbedBuilder()
        .setColor(index === 0 ? 0xff69b4 : 0x4fc3f7)
        .setTitle(index === 0 ? 'Hathor RPG - Complete Command Guide' : category);
      if (index === 0) {
        embed.setDescription(`Every command supports the slash and \`${prefix}\` prefix syntax shown below. Use \`/help command:<command>\` or \`${prefix}help <command-or-alias>\` for one focused entry.`);
      }
      for (const entry of COMMAND_GUIDE.filter((candidate) => candidate.category === category)) {
        embed.addFields({ name: `/${entry.name} - ${entry.summary}`, value: guideValue(entry, prefix) });
      }
      return embed;
    });
    embeds.at(-1).setFooter({ text: 'Arguments in <angle brackets> are required; [square brackets] are optional. Names, aliases, actions, and short IDs are case-insensitive.' });
    let response;
    for (const page of messagePages(embeds)) response = await ctx.reply({ embeds: page });
    return response;
  },
};
