import test from 'node:test';
import assert from 'node:assert/strict';
import hathorweatherlist from '../src/commands/hathorweatherlist.js';
import { BIOMES, ENVIRONMENTS } from '../src/data/worlds.js';

async function executePrefix(args) {
  let response;
  await hathorweatherlist.execute({
    isInteraction: false,
    args,
    reply: async (payload) => { response = payload; },
  }, { config: { prefix: '!' } });
  return response;
}

test('Hathor weather list exposes the requested slash command and prefix aliases', () => {
  assert.equal(hathorweatherlist.data.name, 'hathorweatherlist');
  assert.ok(hathorweatherlist.aliases.includes('hwl'));
});

test('!hwl overview contains all biomes and rain environments within embed limits', async () => {
  const response = await executePrefix([]);
  const data = response.embeds[0].data;
  const serialized = JSON.stringify(data);

  for (const biome of Object.values(BIOMES)) assert.match(serialized, new RegExp(biome.name));
  for (const environment of Object.values(ENVIRONMENTS)) assert.match(serialized, new RegExp(environment.name));
  assert.ok((data.description?.length ?? 0) <= 4096);
  assert.ok(data.fields.every((field) => field.value.length <= 1024));
});

test('!hwl supports case-insensitive detail entries and paginated categories', async () => {
  const detail = await executePrefix(['aCiD', 'RaIn']);
  assert.match(detail.embeds[0].data.title, /Acid Rain/);
  assert.match(JSON.stringify(detail.embeds[0].data.fields), /Elemental spawn influence/);

  const page = await executePrefix(['BIOMES', '2']);
  assert.match(page.embeds[0].data.title, /Biomes/);
  assert.match(page.embeds[0].data.footer.text, /Page 2\/4/);
});
