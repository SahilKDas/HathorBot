import { BIOMES } from '../data/worlds.js';
import { PLAYER_LEGACIES, STORY_SCORE_NAMES } from '../data/story.js';

function zeroes(names) {
  return Object.fromEntries(names.map((name) => [name, 0]));
}

export function createStory(userId) {
  return {
    id: userId,
    version: 1,
    status: 'not_started',
    chapter: 0,
    stage: 'briefing',
    missionProgress: 0,
    completion: 0,
    choices: [],
    scores: zeroes(STORY_SCORE_NAMES),
    crownScores: { fallen: 0, reformed: 0, ascendant: 0 },
    worldScores: { united: 0, divided: 0, untamed: 0 },
    legacyScores: zeroes(Object.keys(PLAYER_LEGACIES)),
    biomeStates: Object.fromEntries(Object.keys(BIOMES).map((id) => [id, 'invaded'])),
    companions: [],
    badges: [],
    unlocks: [],
    milestoneClaims: [],
    explorationLog: [],
    endingId: null,
    discoveredEndings: [],
    echoesCompleted: 0,
    startedAt: null,
    completedAt: null,
    masteredAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeStory(value, userId) {
  const base = createStory(userId);
  const story = { ...base, ...(value ?? {}), id: userId };
  story.chapter = Math.max(0, Math.min(10, Math.trunc(Number(story.chapter) || 0)));
  story.missionProgress = Math.max(0, Math.trunc(Number(story.missionProgress) || 0));
  story.completion = Math.max(0, Math.min(110, Number(story.completion) || 0));
  story.choices = Array.isArray(story.choices) ? story.choices.filter((choice) => choice && typeof choice === 'object') : [];
  story.scores = { ...base.scores, ...(story.scores ?? {}) };
  story.crownScores = { ...base.crownScores, ...(story.crownScores ?? {}) };
  story.worldScores = { ...base.worldScores, ...(story.worldScores ?? {}) };
  story.legacyScores = { ...base.legacyScores, ...(story.legacyScores ?? {}) };
  story.biomeStates = { ...base.biomeStates, ...(story.biomeStates ?? {}) };
  for (const key of [...Object.keys(story.scores), ...Object.keys(story.crownScores), ...Object.keys(story.worldScores), ...Object.keys(story.legacyScores)]) {
    const collection = Object.hasOwn(story.scores, key) ? story.scores
      : Object.hasOwn(story.crownScores, key) ? story.crownScores
        : Object.hasOwn(story.worldScores, key) ? story.worldScores : story.legacyScores;
    collection[key] = Number(collection[key]) || 0;
  }
  for (const property of ['companions', 'badges', 'unlocks', 'milestoneClaims', 'discoveredEndings']) {
    story[property] = [...new Set(Array.isArray(story[property]) ? story[property].filter((item) => typeof item === 'string' || typeof item === 'number') : [])];
  }
  story.explorationLog = Array.isArray(story.explorationLog) ? story.explorationLog.slice(-20) : [];
  story.echoesCompleted = Math.max(0, Math.min(5, Math.trunc(Number(story.echoesCompleted) || 0)));
  return story;
}
