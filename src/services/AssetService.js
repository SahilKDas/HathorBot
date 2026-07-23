import { existsSync } from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder } from 'discord.js';

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

  daycare() {
    return this.#attachment(path.join(this.rootDirectory, 'daycare', 'background.png'), 'hathor-daycare.png');
  }
}
