import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Database } from '../src/database/Database.js';
import { generateWildCreature } from '../src/services/CreatureFactory.js';
import { AscensionService } from '../src/services/AscensionService.js';
import { AuditService } from '../src/services/AuditService.js';
import { BattleService } from '../src/services/BattleService.js';
import { CreatureProgressionService } from '../src/services/CreatureProgressionService.js';
import { EquipmentService } from '../src/services/EquipmentService.js';
import { MarketplaceService } from '../src/services/MarketplaceService.js';
import { QuestService } from '../src/services/QuestService.js';
import { TeamService } from '../src/services/TeamService.js';
import { TradeService } from '../src/services/TradeService.js';
import { UserService } from '../src/services/UserService.js';
import { WorldService } from '../src/services/WorldService.js';

async function ownedCreature(database, ownerId, level = 12) {
  const creature = generateWildCreature();
  creature.ownerId = ownerId;
  creature.level = level;
  creature.caughtAt = new Date().toISOString();
  await database.creatures.set(creature.id, creature, { flush: true });
  return creature;
}

test('advanced systems persist teams, battles, gear, ascension, trades, market, and world weights', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hathor-advanced-'));
  const database = new Database(directory);
  await database.init();
  const config = { spawn: { defaultChannelIds: [] } };
  const users = new UserService(database);
  const audit = new AuditService(database);
  const progression = new CreatureProgressionService({ database, userService: users });
  const quests = new QuestService({ userService: users, progressionService: progression });
  const teams = new TeamService({ database, userService: users });
  const equipment = new EquipmentService({ database, userService: users, progressionService: progression, auditService: audit });
  const ascension = new AscensionService({ database, userService: users, auditService: audit });
  const battles = new BattleService({ database, userService: users, teamService: teams, questService: quests, progressionService: progression, auditService: audit });
  const trades = new TradeService({ database, userService: users, auditService: audit });
  const market = new MarketplaceService({ database, userService: users, auditService: audit });
  const worlds = new WorldService({ database, config });

  const [firstA, secondA, firstB, secondB] = await Promise.all([
    ownedCreature(database, 'user-a', 18), ownedCreature(database, 'user-a', 14),
    ownedCreature(database, 'user-b', 17), ownedCreature(database, 'user-b', 13),
  ]);
  await users.update('user-a', (user) => {
    user.inventory = [firstA.id, secondA.id]; user.shrimpCoins = 10_000; user.ascensionSigils = 3;
  }, { flush: true });
  await users.update('user-b', (user) => {
    user.inventory = [firstB.id, secondB.id]; user.shrimpCoins = 10_000;
  }, { flush: true });
  assert.ok((await teams.add('user-a', firstA.id.slice(0, 8))).ok);
  assert.ok((await teams.add('user-b', firstB.id.slice(0, 8))).ok);

  const challenge = await battles.challenge({ guildId: 'guild-1', channelId: 'channel-1', challengerId: 'user-a', opponentId: 'user-b' });
  assert.ok(challenge.ok);
  let battle = (await battles.accept(challenge.battle, 'user-b')).battle;
  for (let turn = 0; battle.status === 'active' && turn < 200; turn += 1) {
    battle = (await battles.move(battle, battle.turnUserId, 'peck')).battle;
  }
  assert.equal(battle.status, 'complete');
  assert.ok(database.audit.values().some((entry) => entry.action === 'battle.complete'));

  assert.ok((await equipment.buy('user-a', 'razor_charm')).ok);
  assert.ok((await equipment.equip('user-a', firstA.id, 'razor_charm')).ok);
  const beforeProgress = database.creatures.get(firstA.id);
  const progress = await progression.addXp(firstA.id, 2_000);
  assert.ok(progress.creature.level > beforeProgress.level);
  const ascended = await ascension.ascend('user-a', firstA.id);
  assert.ok(ascended.ok && ascended.creature.ascended);

  const trade = await trades.offer({ guildId: 'guild-1', channelId: 'channel-1', proposerId: 'user-a', targetId: 'user-b', offeredQuery: secondA.id, requestedQuery: secondB.id, coins: 250 });
  assert.ok(trade.ok);
  assert.ok((await trades.accept(trade.trade, 'user-b')).ok);
  assert.equal(database.creatures.get(secondA.id).ownerId, 'user-b');
  assert.equal(database.creatures.get(secondB.id).ownerId, 'user-a');

  const draft = await market.draft('user-a', firstA.id, 900);
  assert.ok(draft.ok);
  assert.ok((await market.publish(draft.listing, 'user-a')).ok);
  assert.ok((await market.buy(draft.listing, 'user-b')).ok);
  assert.equal(database.creatures.get(firstA.id).ownerId, 'user-b');

  const world = await worlds.current('guild-1', { rotate: true });
  assert.ok(world.biome && world.environment);
  assert.ok(Object.values(world.rarityWeights).every((weight) => weight >= 1));
  assert.ok(Object.values(world.typeWeights).some((weight) => weight > 1));
  await database.flushAll();
});
