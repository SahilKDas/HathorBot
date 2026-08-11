import { MAX_CREATURE_LEVEL, recalculateCreature } from './CreatureFactory.js';

export function xpForNextCreatureLevel(level) {
  return 100 + Math.max(1, level) * 35;
}

export class CreatureProgressionService {
  constructor({ database, userService }) {
    this.database = database;
    this.users = userService;
  }

  async addXp(creatureId, amount, { flush = true } = {}) {
    const gained = Math.max(0, Math.trunc(Number(amount) || 0));
    let summary = null;
    await this.database.creatures.update(creatureId, (current) => {
      if (!current || current.archived) return undefined;
      const creature = recalculateCreature(current);
      const previousLevel = creature.level;
      creature.xp += gained;
      while (creature.level < MAX_CREATURE_LEVEL) {
        const needed = xpForNextCreatureLevel(creature.level);
        if (creature.xp < needed) break;
        creature.xp -= needed;
        creature.level += 1;
      }
      if (creature.level >= MAX_CREATURE_LEVEL) creature.xp = 0;
      recalculateCreature(creature);
      creature.updatedAt = new Date().toISOString();
      summary = { creature, gained, levelsGained: creature.level - previousLevel };
      return creature;
    }, { flush });
    return summary;
  }

  teamIds(userId) {
    const user = this.users.get(userId);
    const valid = user.team.filter((id) => {
      const creature = this.database.creatures.get(id);
      return creature?.ownerId === userId && !creature.archived;
    });
    return (valid.length ? valid : user.inventory.filter((id) => {
      const creature = this.database.creatures.get(id);
      return creature?.ownerId === userId && !creature.archived;
    })).slice(0, 6);
  }

  async awardTeam(userId, amount) {
    const summaries = [];
    for (const id of this.teamIds(userId)) {
      const summary = await this.addXp(id, amount);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }
}
