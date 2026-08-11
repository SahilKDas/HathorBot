import path from 'node:path';
import { JsonStore } from './JsonStore.js';

export class Database {
  constructor(dataDir) {
    this.users = new JsonStore(path.join(dataDir, 'users.json'));
    this.creatures = new JsonStore(path.join(dataDir, 'creatures.json'));
    this.guilds = new JsonStore(path.join(dataDir, 'guilds.json'));
    this.spawns = new JsonStore(path.join(dataDir, 'spawns.json'), { writeDelayMs: 0 });
    this.meta = new JsonStore(path.join(dataDir, 'meta.json'));
    this.battles = new JsonStore(path.join(dataDir, 'battles.json'));
    this.trades = new JsonStore(path.join(dataDir, 'trades.json'));
    this.market = new JsonStore(path.join(dataDir, 'market.json'));
    this.audit = new JsonStore(path.join(dataDir, 'audit.json'));
    this.stories = new JsonStore(path.join(dataDir, 'stories.json'));
    this.stores = [
      this.users, this.creatures, this.guilds, this.spawns, this.meta,
      this.battles, this.trades, this.market, this.audit, this.stories,
    ];
  }

  async init() {
    await Promise.all(this.stores.map((store) => store.init()));
  }

  async flushAll() {
    await Promise.all(this.stores.map((store) => store.flush()));
  }

  snapshot() {
    return {
      users: this.users.snapshot(),
      creatures: this.creatures.snapshot(),
      guilds: this.guilds.snapshot(),
      spawns: this.spawns.snapshot(),
      meta: this.meta.snapshot(),
      battles: this.battles.snapshot(),
      trades: this.trades.snapshot(),
      market: this.market.snapshot(),
      audit: this.audit.snapshot(),
      stories: this.stories.snapshot(),
    };
  }
}
