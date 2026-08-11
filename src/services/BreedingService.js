import { randomUUID } from 'node:crypto';
import { breedCreature, generateCreatureForSpecies } from './CreatureFactory.js';

export class BreedingService {
  constructor({ database, config, userService, questService, progressionService }) {
    this.database = database;
    this.config = config;
    this.users = userService;
    this.quests = questService;
    this.progression = progressionService;
    this.hatchLocks = new Set();
  }

  daycarePairs(user) {
    return [user.daycare, ...(user.extraDaycares ?? [])].filter(Boolean);
  }

  async noteMessage(userId) {
    if (!this.database.users.has(userId)) return;
    const current = this.users.get(userId);
    if (!current.daycare && current.extraDaycares.length === 0 && current.eggs.length === 0) return;
    await this.users.update(userId, (user) => {
      for (const daycare of this.daycarePairs(user)) daycare.messageProgress += 1;
      for (const egg of user.eggs) egg.messageProgress += 1;
    });
  }

  getCreatureOwnedBy(user, creatureId) {
    const query = String(creatureId ?? '').toLowerCase();
    const matches = user.inventory.filter((id) => id.toLowerCase() === query || id.toLowerCase().startsWith(query));
    if (matches.length !== 1) return null;
    const creature = this.database.creatures.get(matches[0]);
    return creature?.ownerId === user.id ? creature : null;
  }

  async place(userId, firstId, secondId) {
    let result;
    await this.users.update(userId, (user) => {
      const pairs = this.daycarePairs(user);
      if (pairs.length >= user.daycareSlots) {
        result = { ok: false, reason: `Your ${user.daycareSlots === 1 ? 'Daycare already has a pair' : 'two Daycare pair slots are full'}.` };
        return;
      }
      if (String(firstId).toLowerCase() === String(secondId).toLowerCase()) {
        result = { ok: false, reason: 'Choose two different Flamingos.' };
        return;
      }
      const first = this.getCreatureOwnedBy(user, firstId);
      const second = this.getCreatureOwnedBy(user, secondId);
      if (!first || !second) {
        result = { ok: false, reason: 'Both IDs must belong to Flamingos in your box.' };
        return;
      }
      if (first.id === second.id) {
        result = { ok: false, reason: 'Choose two different Flamingos.' };
        return;
      }
      if (pairs.some((pair) => pair.parentIds.includes(first.id) || pair.parentIds.includes(second.id))) {
        result = { ok: false, reason: 'A Hathor cannot stay in two Daycare pairs at once.' };
        return;
      }
      const daycare = {
        id: randomUUID(),
        parentIds: [first.id, second.id],
        startedAt: new Date().toISOString(),
        readyAt: new Date(Date.now() + this.config.daycare.breedMs).toISOString(),
        messageProgress: 0,
      };
      if (!user.daycare) user.daycare = daycare;
      else user.extraDaycares.push(daycare);
      result = { ok: true, daycare, parents: [first, second], slot: pairs.length + 1 };
    }, { flush: true });
    return result;
  }

  isDaycareReady(daycare) {
    return Date.now() >= Date.parse(daycare.readyAt) || daycare.messageProgress >= this.config.daycare.breedMessages;
  }

  isEggReady(egg) {
    return Date.now() >= Date.parse(egg.readyAt) || egg.messageProgress >= this.config.daycare.hatchMessages;
  }

  async collect(userId, daycareId = null) {
    let result;
    await this.users.update(userId, (user) => {
      const pairs = this.daycarePairs(user);
      if (!pairs.length) {
        result = { ok: false, reason: 'Your Daycare is empty.' };
        return;
      }
      const query = String(daycareId ?? '').trim().toLowerCase();
      const matches = query
        ? pairs.filter((pair) => String(pair.id ?? '').toLowerCase() === query || String(pair.id ?? '').toLowerCase().startsWith(query))
        : pairs.filter((pair) => this.isDaycareReady(pair));
      const daycare = query ? (matches.length === 1 ? matches[0] : null) : matches[0] ?? pairs[0];
      if (!daycare) {
        result = { ok: false, reason: 'That Daycare pair ID is missing or ambiguous.' };
        return;
      }
      if (!this.isDaycareReady(daycare)) {
        result = { ok: false, reason: 'The pair has not produced an Egg yet.' };
        return;
      }
      const parents = daycare.parentIds.map((id) => this.getCreatureOwnedBy(user, id));
      if (parents.some((parent) => !parent)) {
        result = { ok: false, reason: 'A Daycare parent could not be found in your box.' };
        return;
      }
      const egg = {
        id: randomUUID(),
        parentIds: [...daycare.parentIds],
        createdAt: new Date().toISOString(),
        readyAt: new Date(Date.now() + this.config.daycare.hatchMs).toISOString(),
        messageProgress: 0,
      };
      user.eggs.push(egg);
      if (user.daycare?.id === daycare.id || user.daycare === daycare) user.daycare = user.extraDaycares.shift() ?? null;
      else user.extraDaycares = user.extraDaycares.filter((pair) => pair.id !== daycare.id);
      result = { ok: true, egg, daycare };
    }, { flush: true });
    if (result?.ok) {
      for (const parentId of result.egg.parentIds) await this.progression.addXp(parentId, 90);
    }
    return result;
  }

  async hatch(userId, eggId) {
    if (this.hatchLocks.has(userId)) return { ok: false, reason: 'An Egg is already hatching for you.' };
    this.hatchLocks.add(userId);
    try {
      let prepared;
      await this.users.update(userId, (user) => {
        const query = String(eggId ?? '').toLowerCase();
        const matchingEggs = user.eggs.filter((entry) => entry.id.toLowerCase() === query || entry.id.toLowerCase().startsWith(query));
        const egg = matchingEggs.length === 1 ? matchingEggs[0] : null;
        if (!egg) {
          prepared = { ok: false, reason: 'That Egg ID is missing or ambiguous.' };
          return;
        }
        if (!this.isEggReady(egg)) {
          prepared = { ok: false, reason: 'That Egg is not ready to hatch.' };
          return;
        }
        const parents = egg.origin === 'story-echo' ? [] : egg.parentIds.map((id) => this.getCreatureOwnedBy(user, id));
        if (parents.some((parent) => !parent)) {
          prepared = { ok: false, reason: "The Egg's parent data is unavailable." };
          return;
        }
        prepared = { ok: true, egg, parents };
      });
      if (!prepared?.ok) return prepared;

      const creature = prepared.egg.origin === 'story-echo'
        ? generateCreatureForSpecies(prepared.egg.guaranteedSpecies, {
          ivs: prepared.egg.guaranteedIvs,
          origin: 'story-echo',
          level: 1,
        })
        : breedCreature(...prepared.parents);
      creature.ownerId = userId;
      creature.caughtAt = new Date().toISOString();
      creature.imageAsset = `hathors/${creature.species.toLowerCase()}.png`;
      await this.database.creatures.set(creature.id, creature, { flush: true });
      await this.users.update(userId, (user) => {
        if (!user.eggs.some((entry) => entry.id === prepared.egg.id)) return;
        user.eggs = user.eggs.filter((entry) => entry.id !== prepared.egg.id);
        user.inventory.push(creature.id);
        user.statistics.hatches += 1;
      }, { flush: true });
      await this.quests.record(userId, 'hatch', creature);
      await this.progression.addXp(creature.id, 60);
      for (const parent of prepared.parents) await this.progression.addXp(parent.id, 35);
      return { ok: true, creature: this.database.creatures.get(creature.id) };
    } finally {
      this.hatchLocks.delete(userId);
    }
  }
}
