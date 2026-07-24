import test from 'node:test';
import assert from 'node:assert/strict';
import hathordex from '../src/commands/hathordex.js';
import { normalizeName } from '../src/utils/text.js';

test('species normalization ignores capitalization and punctuation', () => {
  assert.equal(normalizeName('CoRaL-uMe!!'), 'coralume');
  assert.equal(normalizeName('  SOL STILT  '), 'solstilt');
});

test('Hathordex supports !h and mixed-case species detail lookups', async () => {
  assert.ok(hathordex.aliases.includes('h'));
  let response;
  const context = {
    isInteraction: false,
    args: ['CoRaLuMe'],
    reply: async (payload) => { response = payload; },
  };
  const app = {
    config: { prefix: '!' },
    assets: { creature: () => null },
  };
  await hathordex.execute(context, app);
  assert.match(response.embeds[0].data.title, /Coralume/);
});
