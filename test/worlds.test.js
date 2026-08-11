import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES } from '../src/data/flamingos.js';
import { BIOMES, ENVIRONMENTS } from '../src/data/worlds.js';
import { WorldService } from '../src/services/WorldService.js';

test('world catalog contains exactly 24 biomes and seven rain environments', () => {
  assert.equal(Object.keys(BIOMES).length, 24);
  assert.deepEqual(
    Object.values(ENVIRONMENTS).map((environment) => environment.name).sort(),
    ['Acid Rain', 'Drought', 'Dry', 'Frequent Rain', 'Humid', 'Rainforest', 'Snow'].sort(),
  );

  const reachableEnvironments = new Set();
  for (const [biomeId, biome] of Object.entries(BIOMES)) {
    assert.ok(biome.name && biome.description && biome.emoji, `${biomeId} needs display metadata`);
    assert.ok(biome.rarityBoost >= 1, `${biomeId} cannot reduce rarity odds`);
    assert.ok(biome.environments.length > 0, `${biomeId} needs compatible environments`);
    for (const environmentId of biome.environments) {
      assert.ok(ENVIRONMENTS[environmentId], `${biomeId} references unknown environment ${environmentId}`);
      reachableEnvironments.add(environmentId);
    }
    for (const [type, weight] of Object.entries(biome.types)) {
      assert.ok(TYPES.includes(type), `${biomeId} references unknown type ${type}`);
      assert.ok(weight > 0, `${biomeId} has a non-positive type weight`);
    }
  }
  assert.deepEqual([...reachableEnvironments].sort(), Object.keys(ENVIRONMENTS).sort());
});

test('rain environment is a secondary multiplier beneath the biome', () => {
  const worlds = new WorldService({ database: null, config: null });
  const world = worlds.describe({
    biomeId: 'skyreach',
    environmentId: 'dry',
    startedAt: new Date(0).toISOString(),
    expiresAt: new Date(1).toISOString(),
  });

  assert.equal(world.biome.name, 'Skyreach Cliffs');
  assert.equal(world.environment.name, 'Dry');
  assert.equal(world.typeWeights.Air, BIOMES.skyreach.types.Air * ENVIRONMENTS.dry.types.Air);
  assert.equal(world.typeWeights.Cosmic, ENVIRONMENTS.dry.types.Cosmic);
  assert.equal(world.typeWeights.Water, ENVIRONMENTS.dry.types.Water);
  assert.ok(Object.values(world.rarityWeights).every((weight) => weight >= 1));
});
