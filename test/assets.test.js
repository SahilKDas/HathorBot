import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAMINGOS } from '../src/data/flamingos.js';
import { AssetService } from '../src/services/AssetService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

test('every Hathordex species and the Daycare have a permanent static asset', () => {
  const assets = new AssetService(root);
  for (const species of FLAMINGOS) {
    const asset = assets.creature(species.name);
    assert.ok(asset, `Missing static asset for ${species.name}`);
    assert.match(asset.attachmentUrl, /^attachment:\/\/hathor-[a-z0-9-]+\.png$/);
  }
  assert.ok(assets.daycare(), 'Missing static Daycare background');
});
