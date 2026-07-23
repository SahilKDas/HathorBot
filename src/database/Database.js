import path from 'node:path';
import { JsonStore } from './JsonStore.js';

export class Database {
  constructor(dataDir) {
    this.users = new JsonStore(path.join(dataDir, 'users.json'));
    this.creatures = new JsonStore(path.join(dataDir, 'creatures.json'));
    this.guilds = new JsonStore(path.join(dataDir, 'guilds.json'));
    this.spawns = new JsonStore(path.join(dataDir, 'spawns.json'), { writeDelayMs: 0 });
    this.meta = new JsonStore(path.join(dataDir, 'meta.json'));
    this.stores = [this.users, this.creatures, this.guilds, this.spawns, this.meta];
  }

  async init() {
    await Promise.all(this.stores.map((store) => store.init()));
  }

  async flushAll() {
    await Promise.all(this.stores.map((store) => store.flush()));
  }
}
