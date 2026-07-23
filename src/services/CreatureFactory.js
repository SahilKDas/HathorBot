import { randomUUID } from 'node:crypto';
import { FLAMINGOS, NATURES, RARITIES } from '../data/flamingos.js';
import { chance, clamp, int, pick, weightedPick } from '../utils/random.js';

const STAT_NAMES = ['hp', 'attack', 'defense', 'speed'];
export const IV_CAP = 10;
export const MAX_CREATURE_LEVEL = 1024;

function rollSpecies() {
  const rarity = weightedPick(Object.entries(RARITIES), ([, details]) => details.weight)[0];
  return pick(FLAMINGOS.filter((species) => species.rarity === rarity));
}

function calculateStats(base, ivs, level, multiplier) {
  return Object.fromEntries(STAT_NAMES.map((stat) => {
    const hpBonus = stat === 'hp' ? level + 10 : 5;
    const rawStat = (((((2 * base[stat] + ivs[stat]) * level) / 100) + hpBonus) * multiplier);
    return [stat, Math.floor(rawStat)];
  }));
}

function ivPercentage(ivs) {
  const total = STAT_NAMES.reduce((sum, stat) => sum + ivs[stat], 0);
  return Number(((total / (IV_CAP * STAT_NAMES.length)) * 100).toFixed(2));
}

function buildCreature(species, { ivs, shiny, gigantamax, level = 1, origin = 'wild', parents = [] } = {}) {
  const rarity = species.rarity;
  const cappedLevel = clamp(Math.trunc(level), 1, MAX_CREATURE_LEVEL);
  const rolledIvs = ivs ?? Object.fromEntries(STAT_NAMES.map((stat) => [stat, int(0, IV_CAP)]));
  const isShiny = shiny ?? chance(1, 512);
  const isGigantamax = gigantamax ?? chance(1, 1000);
  const formMultiplier = isGigantamax ? 1.18 : 1;
  const stats = calculateStats(species.base, rolledIvs, cappedLevel, RARITIES[rarity].multiplier * formMultiplier);

  return {
    id: randomUUID(),
    ownerId: null,
    species: species.name,
    type: species.type,
    rarity,
    description: species.description,
    level: cappedLevel,
    xp: 0,
    nature: pick(NATURES),
    gender: pick(['Female', 'Male', 'Genderless']),
    shiny: isShiny,
    gigantamax: isGigantamax,
    ivs: rolledIvs,
    ivPercentage: ivPercentage(rolledIvs),
    stats,
    image: null,
    origin,
    parents,
    caughtAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function generateWildCreature() {
  return buildCreature(rollSpecies());
}

export function breedCreature(parentA, parentB) {
  const speciesName = pick([parentA.species, parentB.species]);
  const species = FLAMINGOS.find((entry) => entry.name === speciesName) ?? rollSpecies();
  const ivs = {};
  const inheritedStats = new Set();

  while (inheritedStats.size < 2) inheritedStats.add(pick(STAT_NAMES));
  for (const stat of STAT_NAMES) {
    if (inheritedStats.has(stat)) ivs[stat] = clamp(pick([parentA.ivs[stat], parentB.ivs[stat]]), 0, IV_CAP);
    else ivs[stat] = clamp(Math.round((parentA.ivs[stat] + parentB.ivs[stat]) / 2) + int(-2, 2), 0, IV_CAP);
  }

  // Breeding improves mutation odds while keeping mutations exceptional.
  return buildCreature(species, {
    ivs,
    shiny: chance(1, 128),
    gigantamax: chance(1, 250),
    origin: 'daycare',
    parents: [parentA.id, parentB.id],
  });
}

export function recalculateCreature(creature) {
  const species = FLAMINGOS.find((entry) => entry.name === creature.species);
  if (!species) return creature;
  creature.level = clamp(Math.trunc(creature.level), 1, MAX_CREATURE_LEVEL);
  creature.ivPercentage = ivPercentage(creature.ivs);
  creature.stats = calculateStats(
    species.base,
    creature.ivs,
    creature.level,
    RARITIES[creature.rarity].multiplier * (creature.gigantamax ? 1.18 : 1),
  );
  return creature;
}

export const CreatureStats = Object.freeze({ names: STAT_NAMES, ivPercentage, ivCap: IV_CAP, maxLevel: MAX_CREATURE_LEVEL });
