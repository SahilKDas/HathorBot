import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { JsonStore } from '../src/database/JsonStore.js';

test('JsonStore serializes concurrent updates without losing records', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flamingo-store-'));
  const file = path.join(directory, 'users.json');
  const store = new JsonStore(file, { writeDelayMs: 1 });
  await store.init();
  await Promise.all(Array.from({ length: 50 }, (_, index) => store.set(String(index), { index })));
  await store.flush();
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(Object.keys(saved.records).length, 50);
  assert.equal(saved.records['49'].index, 49);
});

test('JsonStore only deletes a record through an explicit delete call', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flamingo-delete-'));
  const file = path.join(directory, 'creatures.json');
  const store = new JsonStore(file);
  await store.init();
  await store.set('kept', { species: 'Solstilt' });
  await store.set('removed', { species: 'Ripplebill' });
  assert.equal(await store.delete('removed', { flush: true }), true);
  assert.equal(store.has('kept'), true);
  assert.equal(store.has('removed'), false);
});
