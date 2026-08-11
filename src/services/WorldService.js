import { BIOMES, ENVIRONMENTS, WORLD_EVENT_DURATION_MS } from '../data/worlds.js';
import { normalizeGuild } from '../models/Guild.js';
import { pick } from '../utils/random.js';

const rarityExponent = { Common: 0, Uncommon: 0.35, Rare: 1, Epic: 1.4, Legendary: 1.8, Mythic: 2.2 };
const legacyBiomes = {
  lagoon: 'roseglass_lagoon', caldera: 'cinderheart_caldera', badlands: 'sunscorch_badlands',
  canopy: 'emerald_crown', observatory: 'starwatch_plateau', skyreach: 'skyreach',
  glacier: 'mirrorfall_glacier', stormcoast: 'tempest_shore',
};
const legacyEnvironments = {
  clear: 'dry', downpour: 'frequent_rain', heatwave: 'drought', sandstorm: 'dry',
  bloom: 'rainforest', meteor: 'dry', gale: 'dry', blizzard: 'snow', thunderstorm: 'frequent_rain',
};

export class WorldService {
  constructor({ database, config }) {
    this.database = database;
    this.config = config;
  }

  #newWorld() {
    const biomeId = pick(Object.keys(BIOMES));
    const environmentId = pick(BIOMES[biomeId].environments);
    const startedAt = new Date();
    return {
      biomeId,
      environmentId,
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + WORLD_EVENT_DURATION_MS).toISOString(),
    };
  }

  #migrateWorld(world) {
    if (!world || typeof world !== 'object') return null;
    let biomeId = BIOMES[world.biomeId] ? world.biomeId : legacyBiomes[world.biomeId];
    if (world.weatherId === 'bloom') biomeId = 'great_bloom';
    if (!BIOMES[biomeId]) return null;

    let environmentId = world.environmentId ?? legacyEnvironments[world.weatherId];
    if (!BIOMES[biomeId].environments.includes(environmentId)) {
      environmentId = pick(BIOMES[biomeId].environments);
    }
    return {
      biomeId,
      environmentId,
      startedAt: world.startedAt,
      expiresAt: world.expiresAt,
    };
  }

  async current(guildId, { rotate = false } = {}) {
    let world;
    await this.database.guilds.update(guildId, (current) => {
      const guild = normalizeGuild(current, guildId, this.config.spawn.defaultChannelIds);
      const migrated = this.#migrateWorld(guild.world);
      if (rotate || !migrated || Date.parse(migrated.expiresAt) <= Date.now()) {
        guild.world = this.#newWorld();
      } else {
        guild.world = migrated;
      }
      world = structuredClone(guild.world);
      return guild;
    }, { flush: rotate });
    return this.describe(world);
  }

  describe(world) {
    const biome = BIOMES[world.biomeId];
    const environment = ENVIRONMENTS[world.environmentId];
    const typeWeights = {};
    for (const [type, weight] of Object.entries(biome.types)) typeWeights[type] = (typeWeights[type] ?? 1) * weight;
    for (const [type, weight] of Object.entries(environment.types)) typeWeights[type] = (typeWeights[type] ?? 1) * weight;
    const combinedBoost = biome.rarityBoost * environment.rarityBoost;
    const rarityWeights = Object.fromEntries(Object.entries(rarityExponent)
      .map(([rarity, exponent]) => [rarity, combinedBoost ** exponent]));
    return { ...world, biome, environment, typeWeights, rarityWeights };
  }
}
