import { resolveOwnedCreature } from '../utils/creatures.js';

export const MAX_TEAM_SIZE = 6;

export class TeamService {
  constructor({ database, userService }) {
    this.database = database;
    this.users = userService;
  }

  creatures(userId) {
    const user = this.users.get(userId);
    return user.team
      .map((id) => this.database.creatures.get(id))
      .filter((creature) => creature?.ownerId === userId && !creature.archived);
  }

  async add(userId, query) {
    let result;
    await this.users.update(userId, (user) => {
      const creature = resolveOwnedCreature(this.database, user, query);
      if (!creature) return void (result = { ok: false, reason: 'That Hathor ID is missing or ambiguous.' });
      user.team = user.team.filter((id) => user.inventory.includes(id));
      if (user.team.includes(creature.id)) return void (result = { ok: false, reason: `${creature.species} is already on your team.` });
      if (user.team.length >= MAX_TEAM_SIZE) return void (result = { ok: false, reason: 'Your battle team already has six Hathors.' });
      user.team.push(creature.id);
      result = { ok: true, creature, team: [...user.team] };
    }, { flush: true });
    return result;
  }

  async remove(userId, query) {
    let result;
    await this.users.update(userId, (user) => {
      const creature = resolveOwnedCreature(this.database, user, query);
      if (!creature || !user.team.includes(creature.id)) return void (result = { ok: false, reason: 'That Hathor is not on your team.' });
      user.team = user.team.filter((id) => id !== creature.id);
      result = { ok: true, creature, team: [...user.team] };
    }, { flush: true });
    return result;
  }

  async lead(userId, query) {
    let result;
    await this.users.update(userId, (user) => {
      const creature = resolveOwnedCreature(this.database, user, query);
      if (!creature || !user.team.includes(creature.id)) return void (result = { ok: false, reason: 'Add that Hathor to your team first.' });
      user.team = [creature.id, ...user.team.filter((id) => id !== creature.id)];
      result = { ok: true, creature, team: [...user.team] };
    }, { flush: true });
    return result;
  }

  async clear(userId) {
    await this.users.update(userId, (user) => { user.team = []; }, { flush: true });
    return { ok: true };
  }
}
