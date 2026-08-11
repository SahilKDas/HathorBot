import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Database } from '../src/database/Database.js';
import { BreedingService } from '../src/services/BreedingService.js';
import { CreatureProgressionService } from '../src/services/CreatureProgressionService.js';
import { QuestService } from '../src/services/QuestService.js';
import { SpawnService } from '../src/services/SpawnService.js';
import { UserService } from '../src/services/UserService.js';
import { WorldService } from '../src/services/WorldService.js';

test('spawn, catch, breed, collect, and hatch work as one persisted flow', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flamingo-game-'));
  const database = new Database(directory);
  await database.init();
  const config = {
    prefix: '!',
    spawn: { minMessages: 1, maxMessages: 1, defaultChannelIds: [] },
    daycare: { breedMs: 0, breedMessages: 1, hatchMs: 0, hatchMessages: 1 },
  };
  const users = new UserService(database);
  const progression = new CreatureProgressionService({ database, userService: users });
  const assets = { creature: () => null, daycare: () => null };
  const quests = new QuestService({ userService: users, progressionService: progression });
  const worlds = new WorldService({ database, config });
  const breeding = new BreedingService({ database, config, userService: users, questService: quests, progressionService: progression });
  const spawns = new SpawnService({ database, config, assetService: assets, userService: users, questService: quests, worldService: worlds });
  const sent = [];
  const channel = { id: 'channel-1', guild: { id: 'guild-1' }, send: async (payload) => sent.push(payload) };

  const firstSpawn = await spawns.spawn(channel);
  const firstCatch = await spawns.catch({ guildId: 'guild-1', channelId: 'channel-1', userId: 'user-1', guessedName: firstSpawn.creature.species.toUpperCase() });
  const secondSpawn = await spawns.spawn(channel);
  const secondCatch = await spawns.catch({ guildId: 'guild-1', channelId: 'channel-1', userId: 'user-1', guessedName: secondSpawn.creature.species });
  assert.ok(firstCatch.ok && secondCatch.ok);
  assert.equal(sent.length, 2);

  const placed = await breeding.place('user-1', firstCatch.creature.id.slice(0, 8).toUpperCase(), secondCatch.creature.id.slice(0, 8).toUpperCase());
  assert.ok(placed.ok);
  const collected = await breeding.collect('user-1');
  assert.ok(collected.ok);
  const hatched = await breeding.hatch('user-1', collected.egg.id.slice(0, 8).toUpperCase());
  assert.ok(hatched.ok);
  assert.equal(hatched.creature.parents.length, 2);
  assert.equal(users.get('user-1').inventory.length, 3);
  assert.equal(database.creatures.values().length, 3);
  await database.flushAll();
});
