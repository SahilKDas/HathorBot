import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Database } from '../src/database/Database.js';
import { ENDING_CATALOG, STORY_CHAPTERS } from '../src/data/story.js';
import { generateCreatureForSpecies } from '../src/services/CreatureFactory.js';
import { UserService } from '../src/services/UserService.js';
import { AuditService } from '../src/services/AuditService.js';
import { CreatureProgressionService } from '../src/services/CreatureProgressionService.js';
import { QuestService } from '../src/services/QuestService.js';
import { StoryService } from '../src/services/StoryService.js';
import { BreedingService } from '../src/services/BreedingService.js';

async function setup() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'croaking-crown-'));
  const database = new Database(directory);
  await database.init();
  const users = new UserService(database);
  const audit = new AuditService(database);
  const progression = new CreatureProgressionService({ database, userService: users });
  const quests = new QuestService({ userService: users, progressionService: progression });
  const stories = new StoryService({ database, userService: users, progressionService: progression, auditService: audit });
  const breeding = new BreedingService({
    database,
    config: { daycare: { breedMs: 0, breedMessages: 1, hatchMs: 0, hatchMessages: 1 } },
    userService: users,
    questService: quests,
    progressionService: progression,
  });
  return { database, users, stories, breeding };
}

test('story definition has ten branches, covers 24 biomes, and exposes exactly 99 endings', () => {
  assert.equal(STORY_CHAPTERS.length, 10);
  assert.ok(STORY_CHAPTERS.slice(0, 9).every((chapter) => chapter.choices.length === 3));
  assert.equal(STORY_CHAPTERS[9].choices.length, 5);
  assert.equal(new Set(STORY_CHAPTERS.flatMap((chapter) => chapter.biomes)).size, 24);
  assert.equal(ENDING_CATALOG.length, 99);
  assert.equal(new Set(ENDING_CATALOG.map((ending) => ending.id)).size, 99);
  assert.equal(new Set(ENDING_CATALOG.map((ending) => ending.title)).size, 99);
});

test('one player can finish the chaotic campaign, master 110%, hatch the Mythic Egg, and use both Daycare slots', async () => {
  const { database, users, stories, breeding } = await setup();
  const userId = 'solo-player';
  const begun = await stories.begin(userId);
  assert.ok(begun.ok);

  for (let chapterIndex = 0; chapterIndex < STORY_CHAPTERS.length; chapterIndex += 1) {
    for (let encounter = 0; encounter < STORY_CHAPTERS[chapterIndex].explorations; encounter += 1) {
      const explored = await stories.explore(userId, 'story');
      assert.ok(explored.ok);
      assert.equal(explored.requiredPower, 0);
    }
    const chosen = await stories.choose(userId, chapterIndex === 9 ? 'e' : 'c');
    assert.ok(chosen.ok);
  }

  let story = stories.get(userId);
  assert.equal(story.completion, 100);
  assert.equal(story.status, 'completed');
  assert.equal(story.endingId, 'ascendant:untamed:catastrophe');
  assert.equal(ENDING_CATALOG.find((ending) => ending.id === story.endingId).title, 'Wibble, Devourer of Destiny');
  assert.deepEqual(story.milestoneClaims, [10, 25, 50, 75, 90, 100]);
  assert.equal(users.get(userId).daycareSlots, 2);
  assert.equal(users.get(userId).gigantamaxCatalysts, 1);
  assert.equal(users.get(userId).inventory.length, 2, '90% and 100% should each grant a Hathor');

  let storyEgg = null;
  for (let index = 0; index < 5; index += 1) {
    const echoed = await stories.echo(userId);
    assert.ok(echoed.ok);
    if (echoed.egg) storyEgg = echoed.egg;
  }
  story = stories.get(userId);
  assert.equal(story.completion, 110);
  assert.equal(story.status, 'mastered');
  assert.equal(story.echoesCompleted, 5);
  assert.equal(story.discoveredEndings.length, 6);
  assert.ok(story.badges.includes('Worldwalker'));
  assert.equal(users.get(userId).gigantamaxCatalysts, 2);
  assert.ok(storyEgg);

  const hatched = await breeding.hatch(userId, storyEgg.id.slice(0, 8));
  assert.ok(hatched.ok);
  assert.equal(hatched.creature.species, 'Astrarosa');
  assert.equal(hatched.creature.rarity, 'Mythic');
  assert.ok(Object.values(hatched.creature.ivs).every((iv) => iv >= 8 && iv <= 10));
  const transformed = await stories.useCatalyst(userId, hatched.creature.id.slice(0, 8));
  assert.ok(transformed.ok);
  assert.equal(transformed.creature.gigantamax, true);
  assert.equal(transformed.catalystsRemaining, 1);

  const fourth = generateCreatureForSpecies('Coralume', { ivs: { hp: 5, attack: 5, defense: 5, speed: 5 } });
  fourth.ownerId = userId;
  await database.creatures.set(fourth.id, fourth, { flush: true });
  await users.update(userId, (user) => { user.inventory.push(fourth.id); }, { flush: true });
  const ids = users.get(userId).inventory.slice(0, 4);
  const firstPair = await breeding.place(userId, ids[0], ids[1]);
  const secondPair = await breeding.place(userId, ids[2], ids[3]);
  assert.ok(firstPair.ok && secondPair.ok);
  assert.equal(breeding.daycarePairs(users.get(userId)).length, 2);
  assert.equal(users.get(userId).extraDaycares.length, 1);
  const firstEgg = await breeding.collect(userId, firstPair.daycare.id.slice(0, 8));
  const secondEgg = await breeding.collect(userId, secondPair.daycare.id.slice(0, 8));
  assert.ok(firstEgg.ok && secondEgg.ok);
  assert.equal(breeding.daycarePairs(users.get(userId)).length, 0);
  assert.ok(database.audit.values().some((entry) => entry.action === 'story.choose'));
  assert.ok(database.audit.values().some((entry) => entry.action === 'story.echo'));
});
