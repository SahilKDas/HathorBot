import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAMINGOS } from '../data/flamingos.js';
import { ITEMS } from '../data/items.js';
import { generateCreatureForSpecies, recalculateCreature } from './CreatureFactory.js';

const dashboardDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dashboard');
const assets = {
  '/dev': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/dev/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/dev/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/dev/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
};

function send(response, statusCode, body, contentType) {
  const buffer = Buffer.from(body);
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'",
  });
  response.end(buffer);
}

function json(response, statusCode, payload) {
  send(response, statusCode, `${JSON.stringify(payload, null, 2)}\n`, 'application/json; charset=utf-8');
}

async function bodyJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Body must be valid JSON'), { statusCode: 400 });
  }
}

function boundedInteger(value, minimum, maximum, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw Object.assign(new Error(`${field} must be a number`), { statusCode: 400 });
  return Math.max(minimum, Math.min(maximum, Math.trunc(parsed)));
}

async function patchUser(request, response, database, audit, userId) {
  if (!database.users.has(userId)) return json(response, 404, { ok: false, error: 'User not found' });
  const input = await bodyJson(request);
  const allowed = new Set(['shrimpCoins', 'xp', 'ascensionSigils', 'gigantamaxCatalysts', 'daycareSlots', 'items', 'statistics']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return json(response, 400, { ok: false, error: 'Unsupported trainer field' });
  const updated = await database.users.update(userId, (user) => {
    if (input.shrimpCoins !== undefined) user.shrimpCoins = boundedInteger(input.shrimpCoins, 0, 1_000_000_000, 'shrimpCoins');
    if (input.xp !== undefined) {
      user.xp = boundedInteger(input.xp, 0, 1_000_000_000, 'xp');
      user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
    }
    if (input.ascensionSigils !== undefined) user.ascensionSigils = boundedInteger(input.ascensionSigils, 0, 1_000_000, 'ascensionSigils');
    if (input.gigantamaxCatalysts !== undefined) user.gigantamaxCatalysts = boundedInteger(input.gigantamaxCatalysts, 0, 1_000_000, 'gigantamaxCatalysts');
    if (input.daycareSlots !== undefined) user.daycareSlots = boundedInteger(input.daycareSlots, 1, 2, 'daycareSlots');
    if (input.items !== undefined) {
      if (!input.items || typeof input.items !== 'object' || Array.isArray(input.items)) {
        throw Object.assign(new Error('items must be an object'), { statusCode: 400 });
      }
      if (Object.keys(input.items).some((id) => !ITEMS[id])) {
        throw Object.assign(new Error('items contains an unknown item ID'), { statusCode: 400 });
      }
      user.items = Object.fromEntries(Object.keys(ITEMS)
        .map((id) => [id, boundedInteger(input.items[id] ?? 0, 0, 1_000_000, `items.${id}`)])
        .filter(([, count]) => count > 0));
    }
    if (input.statistics !== undefined) {
      if (!input.statistics || typeof input.statistics !== 'object' || Array.isArray(input.statistics)) {
        throw Object.assign(new Error('statistics must be an object'), { statusCode: 400 });
      }
      const statisticNames = ['catches', 'hatches', 'duelWins', 'duelLosses'];
      if (Object.keys(input.statistics).some((name) => !statisticNames.includes(name))) {
        throw Object.assign(new Error('statistics contains an unknown field'), { statusCode: 400 });
      }
      user.statistics = Object.fromEntries(statisticNames.map((name) => [
        name,
        boundedInteger(input.statistics[name] ?? user.statistics?.[name] ?? 0, 0, 1_000_000_000, `statistics.${name}`),
      ]));
    }
    user.updatedAt = new Date().toISOString();
    return user;
  }, { flush: true });
  await audit.record('dashboard.user.patch', 'localhost-dev', { userId, fields: Object.keys(input) });
  return json(response, 200, { ok: true, record: updated });
}

async function grantCreature(request, response, database, audit) {
  const input = await bodyJson(request);
  const userId = String(input.userId ?? '').trim();
  if (!userId || !database.users.has(userId)) return json(response, 404, { ok: false, error: 'Trainer not found' });
  const species = FLAMINGOS.find((entry) => entry.name.toLowerCase() === String(input.species ?? '').trim().toLowerCase());
  if (!species) return json(response, 400, { ok: false, error: 'Unknown Hathor species' });

  const ivCap = species.name === 'Solstilt' ? 20 : 10;
  const ivs = Object.fromEntries(['hp', 'attack', 'defense', 'speed'].map((stat) => [
    stat,
    boundedInteger(input.ivs?.[stat] ?? ivCap, 0, ivCap, `ivs.${stat}`),
  ]));
  const level = boundedInteger(input.level ?? 50, 1, 1024, 'level');
  let creature = generateCreatureForSpecies(species.name, {
    level,
    ivs,
    shiny: Boolean(input.shiny),
    gigantamax: Boolean(input.gigantamax),
    origin: 'dashboard-grant',
  });
  creature.ownerId = userId;
  creature.caughtAt = new Date().toISOString();
  creature.ascended = Boolean(input.ascended);
  creature.updatedAt = creature.caughtAt;
  creature = recalculateCreature(creature);

  await database.creatures.set(creature.id, creature, { flush: true });
  try {
    await database.users.update(userId, (user) => {
      user.inventory ??= [];
      if (!user.inventory.includes(creature.id)) user.inventory.push(creature.id);
      user.updatedAt = new Date().toISOString();
      return user;
    }, { flush: true });
  } catch (error) {
    await database.creatures.delete(creature.id, { flush: true });
    throw error;
  }
  await audit.record('dashboard.creature.grant', 'localhost-dev', {
    userId, creatureId: creature.id, species: creature.species, level: creature.level, ivs: creature.ivs,
  });
  return json(response, 201, { ok: true, record: creature });
}

async function patchCreature(request, response, database, audit, creatureId) {
  if (!database.creatures.has(creatureId)) return json(response, 404, { ok: false, error: 'Creature not found' });
  const input = await bodyJson(request);
  const allowed = new Set(['level', 'xp', 'ivs', 'shiny', 'gigantamax', 'ascended']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return json(response, 400, { ok: false, error: 'Unsupported creature field' });
  const updated = await database.creatures.update(creatureId, (creature) => {
    if (input.level !== undefined) creature.level = boundedInteger(input.level, 1, 1024, 'level');
    if (input.xp !== undefined) creature.xp = boundedInteger(input.xp, 0, 1_000_000_000, 'xp');
    if (input.ivs !== undefined) {
      if (!input.ivs || typeof input.ivs !== 'object') throw Object.assign(new Error('ivs must be an object'), { statusCode: 400 });
      const cap = creature.species === 'Solstilt' ? 20 : 10;
      creature.ivs = Object.fromEntries(['hp', 'attack', 'defense', 'speed']
        .map((stat) => [stat, boundedInteger(input.ivs[stat] ?? creature.ivs[stat], 0, cap, `ivs.${stat}`)]));
    }
    for (const flag of ['shiny', 'gigantamax', 'ascended']) {
      if (input[flag] !== undefined) creature[flag] = Boolean(input[flag]);
    }
    creature.updatedAt = new Date().toISOString();
    return recalculateCreature(creature);
  }, { flush: true });
  await audit.record('dashboard.creature.patch', 'localhost-dev', { creatureId, fields: Object.keys(input) });
  return json(response, 200, { ok: true, record: updated });
}

export async function handleDeveloperDashboard({ request, response, pathname, database, audit }) {
  if (assets[pathname] && request.method === 'GET') {
    const asset = assets[pathname];
    const body = await readFile(path.join(dashboardDirectory, asset.file));
    send(response, 200, body, asset.type);
    return true;
  }
  if (pathname === '/api/dev/data' && request.method === 'GET') {
    json(response, 200, database.snapshot());
    return true;
  }
  if (pathname === '/api/dev/catalog' && request.method === 'GET') {
    json(response, 200, {
      species: FLAMINGOS.map(({ name, type, rarity }) => ({ name, type, rarity })),
      items: Object.values(ITEMS).map(({ id, name, slot }) => ({ id, name, slot })),
    });
    return true;
  }
  if (pathname === '/api/dev/creatures/grant' && request.method === 'POST') {
    await grantCreature(request, response, database, audit);
    return true;
  }
  const userMatch = pathname.match(/^\/api\/dev\/users\/([^/]+)$/);
  if (userMatch && request.method === 'PATCH') {
    await patchUser(request, response, database, audit, decodeURIComponent(userMatch[1]));
    return true;
  }
  const creatureMatch = pathname.match(/^\/api\/dev\/creatures\/([^/]+)$/);
  if (creatureMatch && request.method === 'PATCH') {
    await patchCreature(request, response, database, audit, decodeURIComponent(creatureMatch[1]));
    return true;
  }
  return false;
}
