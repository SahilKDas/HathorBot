import test from 'node:test';
import assert from 'node:assert/strict';
import { breedCreature, generateWildCreature, IV_CAP, MAX_CREATURE_LEVEL, recalculateCreature } from '../src/services/CreatureFactory.js';

test('wild creatures have valid randomized IVs and stats', () => {
  for (let index = 0; index < 100; index += 1) {
    const creature = generateWildCreature();
    for (const stat of ['hp', 'attack', 'defense', 'speed']) {
      assert.ok(creature.ivs[stat] >= 0 && creature.ivs[stat] <= IV_CAP);
      assert.ok(creature.stats[stat] > 0);
      assert.ok(Number.isInteger(creature.stats[stat]));
    }
    assert.ok(creature.ivPercentage >= 0 && creature.ivPercentage <= 100);
  }
});

test('offspring inherits two or more exact parent IV values', () => {
  const first = generateWildCreature();
  const second = generateWildCreature();
  first.ivs = { hp: 1, attack: 2, defense: 3, speed: 4 };
  second.ivs = { hp: 7, attack: 8, defense: 9, speed: 10 };
  const child = breedCreature(first, second);
  const exact = Object.entries(child.ivs).filter(([stat, value]) => value === first.ivs[stat] || value === second.ivs[stat]);
  assert.ok(exact.length >= 2);
  assert.ok(Object.values(child.ivs).every((iv) => iv <= IV_CAP));
});

test('creature levels cannot exceed the global level cap', () => {
  const creature = generateWildCreature();
  creature.level = MAX_CREATURE_LEVEL + 500;
  recalculateCreature(creature);
  assert.equal(creature.level, MAX_CREATURE_LEVEL);
});
