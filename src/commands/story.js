import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import {
  BIOME_STORY_STATE_NAMES,
  CROWN_OUTCOMES,
  PLAYER_LEGACIES,
  STORY_CHAPTERS,
  WORLD_STATES,
  endingById,
} from '../data/story.js';
import { BIOMES } from '../data/worlds.js';
import { progressBar } from '../utils/text.js';

const choiceOptions = [
  { name: 'A - first choice', value: 'a' },
  { name: 'B - second choice', value: 'b' },
  { name: 'C - third choice', value: 'c' },
  { name: 'D - fourth choice', value: 'd' },
  { name: 'E - fifth choice', value: 'e' },
];

function value(ctx, name, prefixPosition, required = false) {
  return ctx.isInteraction ? ctx.string(name, 0, required) : ctx.args[prefixPosition];
}

function number(ctx, name, prefixPosition) {
  return ctx.isInteraction ? ctx.integer(name, 0) : ctx.integer(name, prefixPosition);
}

function chapterChoices(chapter) {
  return chapter.choices.map((choice) => `**${choice.id.toUpperCase()}. ${choice.label}**`).join('\n');
}

function currentEmbed(story) {
  if (story.status === 'not_started') {
    return new EmbedBuilder().setColor(0x63c74d).setTitle('The Croaking Crown')
      .setDescription('Lilygates are opening across all 24 biomes. Emperor Gloamgut and his frog armies are marching from Croakspire. Use `/story begin` or `!story begin` to start the fully solo campaign.')
      .addFields({ name: 'Campaign', value: '10 major decisions / 99 endings / 110% maximum completion' });
  }
  const chapter = STORY_CHAPTERS[story.chapter];
  const ending = story.endingId ? endingById(story.endingId) : null;
  const embed = new EmbedBuilder().setColor(story.status === 'active' ? 0x63c74d : 0xb388ff)
    .setTitle(story.status === 'active' ? `Chapter ${story.chapter + 1}: ${chapter.title}` : ending.title)
    .setDescription(story.status === 'active' ? chapter.briefing : ending.description)
    .addFields(
      { name: 'Completion', value: `${progressBar(story.completion, 110, 14)} **${story.completion}% / 110%**`, inline: false },
      { name: 'Companions', value: story.companions.join(', ') || 'None yet', inline: true },
      { name: 'Endings discovered', value: `${story.discoveredEndings.length}/99`, inline: true },
    );
  if (story.status === 'active') {
    embed.addFields({
      name: story.stage === 'choice' ? 'Decision ready' : 'Solo encounter progress',
      value: story.stage === 'choice'
        ? `${chapterChoices(chapter)}\nUse \`/story choose\` or \`!story choose <letter>\`.`
        : `${story.missionProgress}/${chapter.explorations} - use \`/story explore\`. Story difficulty never requires other players.`,
    });
  } else {
    embed.addFields(
      { name: 'Crown fate', value: CROWN_OUTCOMES[ending.crownId].name, inline: true },
      { name: 'World state', value: WORLD_STATES[ending.worldId].name, inline: true },
      { name: 'Legacy', value: PLAYER_LEGACIES[ending.legacyId].name, inline: true },
      { name: 'Fractured Echoes', value: `${story.echoesCompleted}/5${story.status === 'mastered' ? ' - mastered' : ''}` },
    );
  }
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('Play The Croaking Crown solo campaign')
    .addSubcommand((command) => command.setName('begin').setDescription('Begin the frog invasion storyline'))
    .addSubcommand((command) => command.setName('status').setDescription('View your current chapter and progress'))
    .addSubcommand((command) => command.setName('explore').setDescription('Run the next solo story encounter')
      .addStringOption((option) => option.setName('difficulty').setDescription('Higher difficulty pays more coins').addChoices(
        { name: 'Story - always available', value: 'story' },
        { name: 'Normal - team power check', value: 'normal' },
        { name: 'Challenge - hard power check', value: 'challenge' },
      )))
    .addSubcommand((command) => command.setName('choose').setDescription('Make the current chapter decision')
      .addStringOption((option) => option.setName('option').setDescription('Decision letter shown by story status').setRequired(true).addChoices(...choiceOptions)))
    .addSubcommand((command) => command.setName('journal').setDescription('Review biome consequences and past decisions')
      .addIntegerOption((option) => option.setName('page').setDescription('Biome page').setMinValue(1).setMaxValue(3)))
    .addSubcommand((command) => command.setName('ending').setDescription('View your canonical ending'))
    .addSubcommand((command) => command.setName('endings').setDescription('Browse the Hall of Ninety-Nine Doors')
      .addIntegerOption((option) => option.setName('page').setDescription('Ending page').setMinValue(1).setMaxValue(10)))
    .addSubcommand((command) => command.setName('echo').setDescription('Complete the next solo postgame Fractured Echo'))
    .addSubcommand((command) => command.setName('catalyst').setDescription('Use a story Gigantamax Catalyst')
      .addStringOption((option) => option.setName('creature').setDescription('Owned Hathor ID').setRequired(true))),
  aliases: ['campaign', 'croak', 'croakingcrown'],
  async execute(ctx, app) {
    const action = ctx.subcommand('status');
    if (action === 'begin') {
      const result = await app.stories.begin(ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const embed = currentEmbed(result.story)
        .setFooter({ text: 'Choices persist, but all content remains solo-completable. Explore three times to reach the first decision.' });
      const asset = app.assets.biome(result.chapter.biomes[0]);
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }
    if (action === 'explore') {
      await ctx.defer();
      const result = await app.stories.explore(ctx.userId, value(ctx, 'difficulty', 1) ?? 'story');
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const embed = new EmbedBuilder().setColor(0x63c74d).setTitle(`${result.chapter.title} - ${result.difficulty} encounter`)
        .setDescription(result.event)
        .addFields(
          { name: 'Solo result', value: `Success - **${result.coins} Shrimp Coins**, ${result.trainerXp} Trainer XP, and ${result.teamXp} team XP.` },
          { name: 'Chapter progress', value: `${result.story.missionProgress}/${result.chapter.explorations}`, inline: true },
          { name: 'Team power', value: `${result.power}${result.requiredPower ? ` / ${result.requiredPower} required` : ' - companion assistance enabled'}`, inline: true },
        );
      if (result.readyForChoice) embed.addFields({ name: 'Decision unlocked', value: chapterChoices(result.chapter) });
      const asset = app.assets.biome(result.chapter.biomes[result.story.missionProgress % result.chapter.biomes.length]);
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }
    if (action === 'choose') {
      await ctx.defer();
      const result = await app.stories.choose(ctx.userId, value(ctx, 'option', 1, true));
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const milestoneText = result.milestones.map((milestone) => `**${milestone.percent}%:** ${milestone.coins ? `${milestone.coins} coins + ` : ''}${milestone.label}`).join('\n');
      const creatureText = result.creatures.map((creature) => `**${creature.species}** (${creature.storyVariant ?? creature.rarity}) \`${creature.id.slice(0, 8)}\``).join('\n');
      const embed = new EmbedBuilder().setColor(0x63c74d).setTitle(`${result.chapter.title} - ${result.option.label}`)
        .setDescription(result.option.consequence)
        .addFields(
          { name: 'Chapter reward', value: `**${result.chapterCoins} Shrimp Coins**` },
          { name: 'Campaign completion', value: `**${result.story.completion}% / 110%**`, inline: true },
        );
      if (milestoneText) embed.addFields({ name: 'Milestones claimed', value: milestoneText });
      if (creatureText) embed.addFields({ name: 'Hathor rewards', value: creatureText });
      if (result.ending) {
        embed.setColor(0xb388ff).addFields(
          { name: `Ending: ${result.ending.title}`, value: result.ending.description },
          { name: 'Hall unlocked', value: 'Use `/story echo` for the five postgame missions and `/story endings` to inspect your discovered doors.' },
        );
      } else embed.addFields({ name: `Next: ${result.nextChapter.title}`, value: result.nextChapter.briefing });
      return ctx.reply({ embeds: [embed] });
    }
    if (action === 'journal') {
      const story = app.stories.get(ctx.userId);
      if (story.status === 'not_started') return ctx.reply({ content: 'Use `/story begin` first.', ephemeral: true });
      const page = Math.max(1, Math.min(3, number(ctx, 'page', 1) ?? 1));
      const biomeEntries = Object.entries(BIOMES).slice((page - 1) * 8, page * 8);
      const lines = biomeEntries.map(([id, biome]) => `${biome.emoji} **${biome.name}** - ${BIOME_STORY_STATE_NAMES[story.biomeStates[id]] ?? story.biomeStates[id]}`);
      const choices = story.choices.slice(-5).map((choice) => `**${choice.label}** - ${choice.consequence}`).join('\n') || 'No decisions yet.';
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x4fc3f7).setTitle(`Croaking Crown Journal - Biomes ${page}/3`)
        .setDescription(lines.join('\n')).addFields({ name: 'Most recent decisions', value: choices })] });
    }
    if (action === 'ending') {
      const story = app.stories.get(ctx.userId);
      if (!story.endingId) return ctx.reply({ content: 'Your canonical ending is decided at 100% completion.', ephemeral: true });
      return ctx.reply({ embeds: [currentEmbed(story)] });
    }
    if (action === 'endings') {
      const story = app.stories.get(ctx.userId);
      if (!story.endingId) return ctx.reply({ content: 'The Hall of Ninety-Nine Doors unlocks at 100%.', ephemeral: true });
      const page = Math.max(1, Math.min(10, number(ctx, 'page', 1) ?? 1));
      const shown = app.stories.endings.slice((page - 1) * 10, page * 10);
      const lines = shown.map((ending, index) => {
        const discovered = story.discoveredEndings.includes(ending.id);
        return `**${(page - 1) * 10 + index + 1}. ${discovered ? ending.title : 'Unopened Door'}**${discovered ? `\n${CROWN_OUTCOMES[ending.crownId].name} / ${WORLD_STATES[ending.worldId].name} / ${PLAYER_LEGACIES[ending.legacyId].name}` : ''}`;
      });
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xb388ff).setTitle('Hall of Ninety-Nine Doors')
        .setDescription(lines.join('\n\n')).setFooter({ text: `${story.discoveredEndings.length}/99 endings discovered - Page ${page}/10` })] });
    }
    if (action === 'echo') {
      await ctx.defer();
      const result = await app.stories.echo(ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const milestoneText = result.milestones.map((milestone) => `**${milestone.percent}%:** ${milestone.label}`).join('\n');
      const embed = new EmbedBuilder().setColor(0xb388ff).setTitle(`${result.echo.title} - ${result.story.completion}%`)
        .setDescription(result.echo.text)
        .addFields(
          { name: 'Echo ending discovered', value: `**${result.echoEnding.title}**` },
          { name: 'Solo reward', value: `**${result.coins} Shrimp Coins**, 250 Trainer XP, and 150 team XP` },
          { name: 'Hall progress', value: `${result.story.discoveredEndings.length}/99 doors / ${result.story.echoesCompleted}/5 required Echoes` },
        );
      if (milestoneText) embed.addFields({ name: 'Milestone rewards', value: milestoneText });
      if (result.egg) embed.addFields({ name: 'Fractured Mythic Egg', value: `Egg \`${result.egg.id.slice(0, 8)}\` is ready. Hatch it with \`/daycare hatch\`.` });
      return ctx.reply({ embeds: [embed] });
    }
    if (action === 'catalyst') {
      const result = await app.stories.useCatalyst(ctx.userId, value(ctx, 'creature', 1, true));
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      const asset = app.assets.creature(result.creature);
      const embed = new EmbedBuilder().setColor(0xffc107).setTitle(`${result.creature.species} became Gigantamax!`)
        .setDescription(`The Croaking Crown Catalyst awakened its massive form. Catalysts remaining: **${result.catalystsRemaining}**.`);
      if (asset) embed.setImage(asset.attachmentUrl);
      return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
    }

    const story = app.stories.get(ctx.userId);
    const embed = currentEmbed(story);
    const chapter = app.stories.chapter(story);
    const asset = chapter ? app.assets.biome(chapter.biomes[0]) : null;
    if (asset) embed.setImage(asset.attachmentUrl);
    return ctx.reply({ embeds: [embed], files: asset ? [asset.attachment] : [] });
  },
};
