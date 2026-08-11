import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FLAMINGOS } from '../src/data/flamingos.js';
import { BIOMES } from '../src/data/worlds.js';
import { AssetService } from '../src/services/AssetService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

test('every Hathordex species, biome, and the Daycare have a permanent static asset', () => {
  assert.equal(FLAMINGOS.length, 50, 'The Hathordex should contain exactly 50 species');
  assert.equal(new Set(FLAMINGOS.map((species) => species.name.toLowerCase())).size, 50, 'Species names must be unique');
  const assets = new AssetService(root);
  for (const species of FLAMINGOS) {
    const asset = assets.creature(species.name);
    assert.ok(asset, `Missing static asset for ${species.name}`);
    assert.match(asset.attachmentUrl, /^attachment:\/\/hathor-[a-z0-9-]+\.png$/);
  }
  for (const biomeId of Object.keys(BIOMES)) {
    const asset = assets.biome(biomeId);
    assert.ok(asset, `Missing static asset for biome ${biomeId}`);
    assert.match(asset.attachmentUrl, /^attachment:\/\/biome-[a-z0-9_-]+\.png$/);
  }
  assert.ok(assets.daycare(), 'Missing static Daycare background');
});

test('spawn and Daycare scenes are composed in memory without writing encounter files', async () => {
  const assets = new AssetService(root);
  const spawn = await assets.spawnScene({ species: 'Solstilt' }, 'skyreach');
  const daycare = await assets.daycareScene({ species: 'Coralume' }, { species: 'Solstilt' });

  for (const scene of [spawn, daycare]) {
    assert.ok(scene);
    assert.ok(Buffer.isBuffer(scene.attachment.attachment), 'Discord attachment must contain an in-memory buffer');
    const metadata = await sharp(scene.attachment.attachment).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 675);
  }
  assert.match(spawn.attachmentUrl, /^attachment:\/\/wild-skyreach-solstilt\.jpg$/);
  assert.match(daycare.attachmentUrl, /^attachment:\/\/daycare-coralume-solstilt\.jpg$/);
});
