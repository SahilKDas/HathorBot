import { randomUUID } from 'node:crypto';
import {
  CROWN_OUTCOMES,
  ENDING_CATALOG,
  PLAYER_LEGACIES,
  STORY_CHAPTERS,
  STORY_ECHOES,
  STORY_MILESTONES,
  WORLD_STATES,
  endingById,
} from '../data/story.js';
import { createStory, normalizeStory } from '../models/Story.js';
import { generateCreatureForSpecies, recalculateCreature } from './CreatureFactory.js';
import { resolveOwnedCreature } from '../utils/creatures.js';
import { int } from '../utils/random.js';

const DIFFICULTIES = Object.freeze({
  story: { multiplier: 1, power: 0, label: 'Story' },
  normal: { multiplier: 1.35, power: 1, label: 'Normal' },
  challenge: { multiplier: 2, power: 1.55, label: 'Challenge' },
});

function addScores(target, changes = {}) {
  for (const [name, amount] of Object.entries(changes)) target[name] = Number(target[name] ?? 0) + Number(amount ?? 0);
}

function highest(scores, order) {
  return order.reduce((best, name) => Number(scores[name] ?? 0) > Number(scores[best] ?? 0) ? name : best, order[0]);
}

function addUnique(target, values = []) {
  for (const value of values) if (!target.includes(value)) target.push(value);
}

export class StoryService {
  constructor({ database, userService, progressionService, auditService }) {
    this.database = database;
    this.users = userService;
    this.progression = progressionService;
    this.audit = auditService;
    this.locks = new Set();
  }

  get chapters() { return STORY_CHAPTERS; }
  get endings() { return ENDING_CATALOG; }

  get(userId) {
    return normalizeStory(this.database.stories.get(userId), userId);
  }

  chapter(storyOrUserId) {
    const story = typeof storyOrUserId === 'string' ? this.get(storyOrUserId) : storyOrUserId;
    return STORY_CHAPTERS[story.chapter] ?? null;
  }

  async begin(userId) {
    const current = this.get(userId);
    if (current.status !== 'not_started') return { ok: false, reason: 'Your Croaking Crown campaign has already begun.', story: current };
    const story = createStory(userId);
    story.status = 'active';
    story.stage = 'explore';
    story.startedAt = new Date().toISOString();
    story.updatedAt = story.startedAt;
    await this.database.stories.set(userId, story, { flush: true });
    await this.audit?.record('story.begin', userId, { chapterId: STORY_CHAPTERS[0].id });
    return { ok: true, story, chapter: STORY_CHAPTERS[0] };
  }

  teamPower(userId) {
    const user = this.users.get(userId);
    const ids = user.team.length ? user.team : user.inventory.slice(0, 6);
    return ids.map((id) => this.database.creatures.get(id))
      .filter((creature) => creature?.ownerId === userId && !creature.archived)
      .reduce((total, creature) => total + Object.values(creature.stats ?? {}).reduce((sum, stat) => sum + Number(stat || 0), 0), 0);
  }

  async explore(userId, requestedDifficulty = 'story') {
    if (this.locks.has(userId)) return { ok: false, reason: 'Another story action is already resolving.' };
    this.locks.add(userId);
    try {
      const difficultyId = String(requestedDifficulty ?? 'story').toLowerCase();
      const difficulty = DIFFICULTIES[difficultyId];
      if (!difficulty) return { ok: false, reason: 'Difficulty must be story, normal, or challenge.' };
      const story = this.get(userId);
      if (story.status === 'not_started') return { ok: false, reason: 'Use `/story begin` first.' };
      if (story.status !== 'active') return { ok: false, reason: 'The main campaign is complete. Enter the Hall with `/story echo`.' };
      if (story.stage !== 'explore') return { ok: false, reason: 'This chapter is ready for a decision. Use `/story choose`.' };
      const chapter = STORY_CHAPTERS[story.chapter];
      const requiredPower = Math.round((55 + story.chapter * 32) * difficulty.power);
      const power = this.teamPower(userId);
      if (difficulty.power && power < requiredPower) {
        return {
          ok: false,
          reason: `${difficulty.label} difficulty recommends **${requiredPower}** team power; your team has **${power}**. Story difficulty always remains available.`,
          power,
          requiredPower,
        };
      }

      const progressBefore = story.missionProgress;
      const event = chapter.encounters[progressBefore % chapter.encounters.length];
      const coins = Math.round((90 + story.chapter * 25) * difficulty.multiplier);
      const trainerXp = 20 + story.chapter * 5;
      const teamXp = 15 + story.chapter * 4;
      let updated;
      await this.database.stories.update(userId, (record) => {
        const next = normalizeStory(record, userId);
        if (next.status !== 'active' || next.stage !== 'explore' || next.chapter !== story.chapter) return next;
        next.missionProgress = Math.min(chapter.explorations, next.missionProgress + 1);
        if (next.missionProgress >= chapter.explorations) next.stage = 'choice';
        next.explorationLog.push({ chapterId: chapter.id, difficulty: difficultyId, event, coins, at: new Date().toISOString() });
        next.explorationLog = next.explorationLog.slice(-20);
        next.updatedAt = new Date().toISOString();
        updated = next;
        return next;
      }, { flush: true });
      await this.users.reward(userId, { coins, xp: trainerXp });
      await this.progression.awardTeam(userId, teamXp);
      await this.audit?.record('story.explore', userId, { chapterId: chapter.id, difficulty: difficultyId, coins });
      return {
        ok: true,
        story: updated,
        chapter,
        event,
        coins,
        trainerXp,
        teamXp,
        difficulty: difficulty.label,
        power,
        requiredPower,
        readyForChoice: updated.stage === 'choice',
      };
    } finally {
      this.locks.delete(userId);
    }
  }

  resolveEnding(story) {
    const crownId = highest(story.crownScores, Object.keys(CROWN_OUTCOMES));
    const worldId = highest(story.worldScores, Object.keys(WORLD_STATES));
    const legacyId = highest(story.legacyScores, Object.keys(PLAYER_LEGACIES));
    return endingById(`${crownId}:${worldId}:${legacyId}`);
  }

  #storyMilestone(story, percent) {
    if (percent === 10) {
      addUnique(story.badges, ['Frog Resistance']);
      addUnique(story.companions, ['Sergeant Wibble']);
    }
    if (percent === 25) addUnique(story.unlocks, ['Lilygate Fast Travel', 'Faction Equipment']);
    if (percent === 50) addUnique(story.unlocks, ['Gigantamax Catalyst']);
    if (percent === 75) addUnique(story.unlocks, ['Second Daycare Pair', 'Croakspire Access']);
    if (percent === 90) addUnique(story.unlocks, ['Route Legendary']);
    if (percent === 100) addUnique(story.unlocks, ['Hall of Ninety-Nine Doors', 'Route Gigantamax']);
    if (percent === 105) addUnique(story.unlocks, ['Fractured Mythic Egg']);
    if (percent === 110) {
      addUnique(story.badges, ['Worldwalker']);
      addUnique(story.unlocks, ['Worldwalker Aura', 'Second Gigantamax Catalyst']);
      addUnique(story.companions, ['Puddle-Eye']);
    }
  }

  async #applyUserMilestones(userId, milestones, story) {
    if (!milestones.length) return;
    const equipmentId = story.scores.ambition + story.scores.greed > story.scores.mercy + story.scores.hathorLoyalty
      ? 'razor_charm' : story.scores.chaos > story.scores.order ? 'focus_charm' : 'coral_charm';
    await this.users.update(userId, (user) => {
      for (const milestone of milestones) {
        user.shrimpCoins += milestone.coins;
        if (milestone.percent === 25) user.items[equipmentId] = (user.items[equipmentId] ?? 0) + 1;
        if (milestone.percent === 50 || milestone.percent === 110) user.gigantamaxCatalysts += 1;
        if (milestone.percent === 75) user.daycareSlots = 2;
      }
    }, { flush: true });
  }

  async #grantCreature(userId, species, { gigantamax = false, variant = null, origin, level = 50 } = {}) {
    const ivs = { hp: 10, attack: 10, defense: 10, speed: 10 };
    const creature = generateCreatureForSpecies(species, { ivs, gigantamax, shiny: false, level, origin });
    creature.ownerId = userId;
    creature.caughtAt = new Date().toISOString();
    creature.storyVariant = variant;
    creature.updatedAt = creature.caughtAt;
    recalculateCreature(creature);
    await this.database.creatures.set(creature.id, creature, { flush: true });
    try {
      await this.users.update(userId, (user) => { user.inventory.push(creature.id); }, { flush: true });
    } catch (error) {
      await this.database.creatures.delete(creature.id, { flush: true });
      throw error;
    }
    await this.audit?.record('story.creature_reward', userId, { creatureId: creature.id, species, gigantamax, variant, origin });
    return creature;
  }

  async #grantMilestoneCreatures(userId, milestones, story) {
    const crownId = this.resolveEnding(story).crownId;
    const rewards = [];
    if (milestones.some((milestone) => milestone.percent === 90)) {
      const species = { fallen: 'Cryocrown', reformed: 'Solstilt', ascendant: 'Terrarch' }[crownId];
      rewards.push(await this.#grantCreature(userId, species, { origin: 'story-90', level: 40 }));
    }
    if (milestones.some((milestone) => milestone.percent === 100)) {
      const reward = {
        fallen: { species: 'Fulminarch', variant: 'Crownshatter' },
        reformed: { species: 'Verdantique', variant: 'Chorusbound' },
        ascendant: { species: 'Magmarose', variant: 'Bog Sovereign' },
      }[crownId];
      rewards.push(await this.#grantCreature(userId, reward.species, {
        gigantamax: true,
        variant: reward.variant,
        origin: 'story-100',
        level: 60,
      }));
    }
    return rewards;
  }

  async choose(userId, requestedOption) {
    if (this.locks.has(userId)) return { ok: false, reason: 'Another story action is already resolving.' };
    this.locks.add(userId);
    try {
      const story = this.get(userId);
      if (story.status === 'not_started') return { ok: false, reason: 'Use `/story begin` first.' };
      if (story.status !== 'active') return { ok: false, reason: 'Your main campaign already has an ending.' };
      if (story.stage !== 'choice') return { ok: false, reason: `Complete ${this.chapter(story).explorations - story.missionProgress} more solo exploration encounter(s) first.` };
      const chapter = STORY_CHAPTERS[story.chapter];
      const optionId = String(requestedOption ?? '').trim().toLowerCase();
      const option = chapter.choices.find((choice) => choice.id === optionId || choice.label.toLowerCase() === optionId);
      if (!option) return { ok: false, reason: `Choose ${chapter.choices.map((choice) => `${choice.id}: ${choice.label}`).join(', ')}.` };

      const previousCompletion = story.completion;
      let updated;
      let ending = null;
      let milestones = [];
      await this.database.stories.update(userId, (record) => {
        const next = normalizeStory(record, userId);
        addScores(next.scores, option.scores);
        addScores(next.crownScores, option.crown);
        addScores(next.worldScores, option.world);
        addScores(next.legacyScores, option.legacy);
        for (const biomeId of chapter.biomes) next.biomeStates[biomeId] = option.biomeState;
        addUnique(next.companions, option.companions);
        next.choices.push({ chapterId: chapter.id, optionId: option.id, label: option.label, consequence: option.consequence, at: new Date().toISOString() });
        next.chapter += 1;
        next.missionProgress = 0;
        next.completion = next.chapter * 10;
        next.stage = next.chapter >= STORY_CHAPTERS.length ? 'echo' : 'explore';
        if (next.chapter >= STORY_CHAPTERS.length) {
          ending = this.resolveEnding(next);
          next.status = 'completed';
          next.endingId = ending.id;
          addUnique(next.discoveredEndings, [ending.id]);
          next.completedAt = new Date().toISOString();
        }
        milestones = STORY_MILESTONES.filter((milestone) => milestone.percent <= next.completion
          && milestone.percent > previousCompletion && !next.milestoneClaims.includes(milestone.percent));
        for (const milestone of milestones) {
          next.milestoneClaims.push(milestone.percent);
          this.#storyMilestone(next, milestone.percent);
        }
        next.updatedAt = new Date().toISOString();
        updated = next;
        return next;
      }, { flush: true });

      const chapterCoins = 250 + story.chapter * 75;
      await this.users.reward(userId, { coins: chapterCoins, xp: 80 + story.chapter * 20 });
      await this.#applyUserMilestones(userId, milestones, updated);
      const creatures = await this.#grantMilestoneCreatures(userId, milestones, updated);
      await this.audit?.record('story.choose', userId, {
        chapterId: chapter.id,
        optionId: option.id,
        completion: updated.completion,
        endingId: ending?.id ?? null,
      });
      return {
        ok: true,
        story: updated,
        chapter,
        option,
        chapterCoins,
        milestones,
        creatures,
        ending,
        nextChapter: STORY_CHAPTERS[updated.chapter] ?? null,
      };
    } finally {
      this.locks.delete(userId);
    }
  }

  #echoEnding(story, echoNumber) {
    const base = endingById(story.endingId);
    const crownIds = Object.keys(CROWN_OUTCOMES);
    const worldIds = Object.keys(WORLD_STATES);
    const legacyIds = Object.keys(PLAYER_LEGACIES);
    const crownId = crownIds[(crownIds.indexOf(base.crownId) + echoNumber) % crownIds.length];
    const worldId = worldIds[(worldIds.indexOf(base.worldId) + echoNumber) % worldIds.length];
    const legacyId = legacyIds[(legacyIds.indexOf(base.legacyId) + echoNumber * 2) % legacyIds.length];
    return endingById(`${crownId}:${worldId}:${legacyId}`);
  }

  async #grantStoryEgg(userId) {
    const egg = {
      id: randomUUID(),
      parentIds: [],
      origin: 'story-echo',
      guaranteedSpecies: 'Astrarosa',
      guaranteedIvs: { hp: int(8, 10), attack: int(8, 10), defense: int(8, 10), speed: int(8, 10) },
      createdAt: new Date().toISOString(),
      readyAt: new Date().toISOString(),
      messageProgress: 0,
    };
    await this.users.update(userId, (user) => { user.eggs.push(egg); }, { flush: true });
    return egg;
  }

  async echo(userId) {
    if (this.locks.has(userId)) return { ok: false, reason: 'Another story action is already resolving.' };
    this.locks.add(userId);
    try {
      const story = this.get(userId);
      if (!story.endingId) return { ok: false, reason: 'Complete the main campaign before entering the Hall of Ninety-Nine Doors.' };
      if (story.echoesCompleted >= STORY_ECHOES.length) return { ok: false, reason: 'You have mastered all five Fractured Echoes.' };
      const echo = STORY_ECHOES[story.echoesCompleted];
      const echoEnding = this.#echoEnding(story, story.echoesCompleted + 1);
      const previousCompletion = story.completion;
      let updated;
      let milestones = [];
      await this.database.stories.update(userId, (record) => {
        const next = normalizeStory(record, userId);
        next.echoesCompleted += 1;
        next.completion = 100 + next.echoesCompleted * 2;
        addUnique(next.discoveredEndings, [echoEnding.id]);
        milestones = STORY_MILESTONES.filter((milestone) => milestone.percent <= next.completion
          && milestone.percent > previousCompletion && !next.milestoneClaims.includes(milestone.percent));
        for (const milestone of milestones) {
          next.milestoneClaims.push(milestone.percent);
          this.#storyMilestone(next, milestone.percent);
        }
        if (next.echoesCompleted >= STORY_ECHOES.length) {
          next.status = 'mastered';
          next.masteredAt = new Date().toISOString();
        }
        next.updatedAt = new Date().toISOString();
        updated = next;
        return next;
      }, { flush: true });
      const coins = 1_000 + story.echoesCompleted * 250;
      await this.users.reward(userId, { coins, xp: 250 });
      await this.progression.awardTeam(userId, 150);
      await this.#applyUserMilestones(userId, milestones, updated);
      const egg = milestones.some((milestone) => milestone.percent === 105) ? await this.#grantStoryEgg(userId) : null;
      await this.audit?.record('story.echo', userId, { echo: updated.echoesCompleted, endingId: echoEnding.id, completion: updated.completion });
      return { ok: true, story: updated, echo, echoEnding, milestones, egg, coins };
    } finally {
      this.locks.delete(userId);
    }
  }

  async useCatalyst(userId, creatureQuery) {
    if (this.locks.has(userId)) return { ok: false, reason: 'Another story action is already resolving.' };
    this.locks.add(userId);
    try {
      const user = this.users.get(userId);
      if (user.gigantamaxCatalysts < 1) return { ok: false, reason: 'You do not have a Gigantamax Catalyst.' };
      const creature = resolveOwnedCreature(this.database, user, creatureQuery);
      if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
      if (creature.gigantamax) return { ok: false, reason: `${creature.species} is already Gigantamax.` };
      const transformed = recalculateCreature({
        ...creature,
        gigantamax: true,
        gigantamaxAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await this.users.update(userId, (current) => { current.gigantamaxCatalysts -= 1; }, { flush: true });
      await this.database.creatures.set(transformed.id, transformed, { flush: true });
      await this.audit?.record('story.catalyst', userId, { creatureId: transformed.id, species: transformed.species });
      return { ok: true, creature: transformed, catalystsRemaining: user.gigantamaxCatalysts - 1 };
    } finally {
      this.locks.delete(userId);
    }
  }
}
