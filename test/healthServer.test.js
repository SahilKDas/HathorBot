import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Database } from '../src/database/Database.js';
import { AuditService } from '../src/services/AuditService.js';
import { isLoopback, startHealthServer, stopHealthServer } from '../src/services/HealthServer.js';

test('developer routes recognize only loopback addresses', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback('::1'), true);
  assert.equal(isLoopback('192.168.1.25'), false);
  assert.equal(isLoopback('8.8.8.8'), false);
});

test('localhost /data exposes a readable snapshot of every JSON store', async () => {
  const client = {
    isReady: () => true,
    guilds: { cache: new Map([['guild-1', {}]]) },
  };
  const snapshot = {
    users: { version: 1, records: { 'user-1': { id: 'user-1', shrimpCoins: 25 } } },
    creatures: { version: 1, records: {} },
    guilds: { version: 1, records: {} },
    spawns: { version: 1, records: {} },
    meta: { version: 1, records: {} },
  };
  const database = { snapshot: () => structuredClone(snapshot) };
  const server = await startHealthServer({ client, database, host: '127.0.0.1', port: 0 });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/data`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), snapshot);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    await stopHealthServer(server);
  }
});

test('developer dashboard serves its UI and audits bounded record edits', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hathor-dashboard-'));
  const database = new Database(directory);
  await database.init();
  await database.users.set('user-1', {
    id: 'user-1', shrimpCoins: 10, xp: 0, level: 1, inventory: [], team: [], items: {}, ascensionSigils: 0,
    eggs: [], daycare: null, statistics: {}, dailyQuest: null, cooldowns: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }, { flush: true });
  const audit = new AuditService(database);
  const client = { isReady: () => true, guilds: { cache: new Map() } };
  const server = await startHealthServer({ client, database, audit, host: '127.0.0.1', port: 0 });
  try {
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    const page = await fetch(`${origin}/dev`);
    assert.equal(page.status, 200);
    const pageText = await page.text();
    assert.match(pageText, /HathorBot Developer Console/);
    assert.match(pageText, /Storylines/);
    const catalog = await fetch(`${origin}/api/dev/catalog`);
    assert.equal(catalog.status, 200);
    const catalogBody = await catalog.json();
    assert.equal(catalogBody.species.length, 50);
    assert.ok(catalogBody.items.some((item) => item.id === 'shrimp_treat'));
    const patch = await fetch(`${origin}/api/dev/users/user-1`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shrimpCoins: 4321,
        ascensionSigils: 4,
        gigantamaxCatalysts: 2,
        daycareSlots: 2,
        items: { shrimp_treat: 9 },
        statistics: { catches: 7, hatches: 2, duelWins: 3, duelLosses: 1 },
      }),
    });
    assert.equal(patch.status, 200);
    assert.equal(database.users.get('user-1').shrimpCoins, 4321);
    assert.equal(database.users.get('user-1').ascensionSigils, 4);
    assert.equal(database.users.get('user-1').gigantamaxCatalysts, 2);
    assert.equal(database.users.get('user-1').daycareSlots, 2);
    assert.equal(database.users.get('user-1').items.shrimp_treat, 9);
    assert.equal(database.users.get('user-1').statistics.duelWins, 3);
    assert.ok(database.audit.values().some((entry) => entry.action === 'dashboard.user.patch'));
    const grant = await fetch(`${origin}/api/dev/creatures/grant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1', species: 'sOlStIlT', level: 1024,
        ivs: { hp: 20, attack: 20, defense: 20, speed: 20 },
        shiny: true, gigantamax: true, ascended: true,
      }),
    });
    assert.equal(grant.status, 201);
    const granted = (await grant.json()).record;
    assert.equal(granted.species, 'Solstilt');
    assert.equal(granted.level, 1024);
    assert.equal(granted.ivPercentage, 200);
    assert.equal(granted.ownerId, 'user-1');
    assert.ok(database.users.get('user-1').inventory.includes(granted.id));
    assert.ok(database.audit.values().some((entry) => entry.action === 'dashboard.creature.grant'));
    const editHathor = await fetch(`${origin}/api/dev/creatures/${granted.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 512, shiny: false, ivs: { speed: 19 } }),
    });
    assert.equal(editHathor.status, 200);
    assert.equal(database.creatures.get(granted.id).level, 512);
    assert.equal(database.creatures.get(granted.id).ivs.speed, 19);
    const rejected = await fetch(`${origin}/api/dev/users/user-1`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory: [] }),
    });
    assert.equal(rejected.status, 400);
  } finally {
    await stopHealthServer(server);
  }
});
