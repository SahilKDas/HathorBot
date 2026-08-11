import { existsSync } from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder } from 'discord.js';
import sharp from 'sharp';

export function speciesSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export class AssetService {
  constructor(rootDirectory) {
    this.rootDirectory = rootDirectory;
  }

  #attachment(filePath, name) {
    if (!existsSync(filePath)) return null;
    return {
      attachment: new AttachmentBuilder(filePath, { name }),
      attachmentUrl: `attachment://${name}`,
    };
  }

  creature(creatureOrSpecies) {
    const species = typeof creatureOrSpecies === 'string' ? creatureOrSpecies : creatureOrSpecies.species;
    const slug = speciesSlug(species);
    return this.#attachment(path.join(this.rootDirectory, 'hathors', `${slug}.png`), `hathor-${slug}.png`);
  }

  biome(biomeId) {
    const safeId = String(biomeId ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return this.#attachment(path.join(this.rootDirectory, 'biomes', `${safeId}.png`), `biome-${safeId}.png`);
  }

  async #scene(backgroundPath, creatures, filename) {
    if (!existsSync(backgroundPath) || creatures.length === 0) return null;
    const width = 1200;
    const height = 675;
    const subjectCount = Math.min(2, creatures.length);
    const zoneWidth = width / subjectCount;
    const layers = [];

    for (let index = 0; index < subjectCount; index += 1) {
      const species = typeof creatures[index] === 'string' ? creatures[index] : creatures[index]?.species;
      const creaturePath = path.join(this.rootDirectory, 'hathors', `${speciesSlug(species)}.png`);
      if (!existsSync(creaturePath)) continue;
      const { data, info } = await sharp(creaturePath)
        .resize({
          width: Math.round(subjectCount === 1 ? 620 : 500),
          height: subjectCount === 1 ? 610 : 560,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png()
        .toBuffer({ resolveWithObject: true });
      const left = Math.round((index * zoneWidth) + ((zoneWidth - info.width) / 2));
      const top = Math.max(10, height - info.height - 18);
      layers.push({ input: data, left, top });
    }
    if (!layers.length) return null;

    const buffer = await sharp(backgroundPath)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: 0.86, saturation: 0.94 })
      .composite(layers)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    return {
      attachment: new AttachmentBuilder(buffer, { name: filename }),
      attachmentUrl: `attachment://${filename}`,
    };
  }

  async spawnScene(creature, biomeId) {
    const safeId = String(biomeId ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return this.#scene(
      path.join(this.rootDirectory, 'biomes', `${safeId}.png`),
      [creature],
      `wild-${safeId}-${speciesSlug(creature.species)}.jpg`,
    );
  }

  async daycareScene(...creatures) {
    const present = creatures.filter(Boolean);
    const suffix = present.map((creature) => speciesSlug(creature.species)).join('-') || 'empty';
    return this.#scene(
      path.join(this.rootDirectory, 'daycare', 'background.png'),
      present,
      `daycare-${suffix}.jpg`,
    );
  }

  daycare() {
    return this.#attachment(path.join(this.rootDirectory, 'daycare', 'background.png'), 'hathor-daycare.png');
  }
}
