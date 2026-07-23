import test from 'node:test';
import assert from 'node:assert/strict';
import { ImageService } from '../src/services/ImageService.js';

test('url-template image requests include a numeric unique seed and API authorization', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
  };
  try {
    const service = new ImageService({
      provider: 'url-template',
      endpoint: 'https://images.example/{prompt}?seed={seed}&width={width}&height={height}',
      apiKey: 'secret',
      authHeader: 'Authorization',
      authPrefix: 'Bearer',
      timeoutMs: 1000,
      width: 768,
      height: 768,
    });
    const result = await service.generate({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      rarity: 'Rare', type: 'Fire', species: 'Testplume', description: 'A test creature.', shiny: false, gigantamax: false,
    });
    assert.match(request.url, /seed=\d+/);
    assert.equal(request.options.headers.Authorization, 'Bearer secret');
    assert.equal(result.attachmentUrl, 'attachment://flamingo-ffffffff-ffff-4fff-8fff-ffffffffffff.png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
