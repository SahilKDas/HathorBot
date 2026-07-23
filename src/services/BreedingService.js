import { randomUUID } from 'node:crypto';
import { breedCreature } from './CreatureFactory.js';

export class BreedingService {
  constructor({ database, config, userService, questService, imageService }) {
    this.database = database;
    this.config = config;
    this.users = userService;
    this.quests = questService;
    this.images = imageService;
    this.hatchLocks = new Set();
  }

  async noteMessage(userId) {
    if (!this.database.users.has(userId)) return;
    const current = this.users.get(userId);
    if (!current.daycare && current.eggs.length === 0) return;
    await this.users.update(userId, (user) => {
      if (user.daycare) user.daycare.messageProgress += 1;
      for (const egg of user.eggs) egg.messageProgress += 1;
    });
  }

  getCreatureOwnedBy(user, creatureId) {
    const matches = user.inventory.filter((id) => id === creatureId || id.startsWith(creatureId));
    if (matches.length !== 1) return null;
    const resolvedId = matches[0];
    if (!resolvedId) return null;
    const creature = this.database.creatures.get(resolvedId);
    return creature?.ownerId === user.id ? creature : null;
  }

  async place(userId, firstId, secondId) {
    let result;
    await this.users.update(userId, (user) => {
      if (user.daycare) return void (result = { ok: false, reason: 'Your Daycare already has a pair.' });
      if (firstId === secondId) return void (result = { ok: false, reason: 'Choose two different Flamingos.' });
      const first = this.getCreatureOwnedBy(user, firstId);
      const second = this.getCreatureOwnedBy(user, secondId);
      if (!first || !second) return void (result = { ok: false, reason: 'Both IDs must belong to Flamingos in your box.' });
      if (first.id === second.id) return void (result = { ok: false, reason: 'Choose two different Flamingos.' });
      user.daycare = {
        parentIds: [first.id, second.id],
        startedAt: new Date().toISOString(),
        readyAt: new Date(Date.now() + this.config.daycare.breedMs).toISOString(),
        messageProgress: 0,
      };
      result = { ok: true, daycare: user.daycare, parents: [first, second] };
    }, { flush: true });
    return result;
  }

  isDaycareReady(daycare) {
    return Date.now() >= Date.parse(daycare.readyAt) || daycare.messageProgress >= this.config.daycare.breedMessages;
  }

  isEggReady(egg) {
    return Date.now() >= Date.parse(egg.readyAt) || egg.messageProgress >= this.config.daycare.hatchMessages;
  }

  async collect(userId) {
    let result;
    await this.users.update(userId, (user) => {
      if (!user.daycare) return void (result = { ok: false, reason: 'Your Daycare is empty.' });
      if (!this.isDaycareReady(user.daycare)) return void (result = { ok: false, reason: 'The pair has not produced an Egg yet.' });
      const parents = user.daycare.parentIds.map((id) => this.getCreatureOwnedBy(user, id));
      if (parents.some((parent) => !parent)) return void (result = { ok: false, reason: 'A Daycare parent could not be found in your box.' });
      const egg = {
        id: randomUUID(),
        parentIds: [...user.daycare.parentIds],
        createdAt: new Date().toISOString(),
        readyAt: new Date(Date.now() + this.config.daycare.hatchMs).toISOString(),
        messageProgress: 0,
      };
      user.eggs.push(egg);
      user.daycare = null;
      result = { ok: true, egg };
    }, { flush: true });
    return result;
  }

  async hatch(userId, eggId) {
    if (this.hatchLocks.has(userId)) return { ok: false, reason: 'An Egg is already hatching for you.' };
    this.hatchLocks.add(userId);
    try {
      let prepared;
      await this.users.update(userId, (user) => {
        const matchingEggs = user.eggs.filter((entry) => entry.id === eggId || entry.id.startsWith(eggId));
        const egg = matchingEggs.length === 1 ? matchingEggs[0] : null;
        if (!egg) return void (prepared = { ok: false, reason: 'That Egg ID is missing or ambiguous.' });
        if (!this.isEggReady(egg)) return void (prepared = { ok: false, reason: 'That Egg is not ready to hatch.' });
        const parents = egg.parentIds.map((id) => this.getCreatureOwnedBy(user, id));
        if (parents.some((parent) => !parent)) return void (prepared = { ok: false, reason: 'The Egg’s parent data is unavailable.' });
        prepared = { ok: true, egg, parents };
      });
      if (!prepared?.ok) return prepared;

      const creature = breedCreature(...prepared.parents);
      creature.ownerId = userId;
      creature.caughtAt = new Date().toISOString();
      try {
        const generated = await this.images.generate(creature);
        creature.image = generated.url ?? null;
        creature.imagePrompt = generated.prompt;
        creature.pendingAttachment = generated.attachment ?? null;
        creature.pendingAttachmentUrl = generated.attachmentUrl ?? null;
      } catch (error) {
        console.error(`[images] Hatch image failed for ${creature.species}:`, error.message);
      }
      const persistedCreature = { ...creature };
      delete persistedCreature.pendingAttachment;
      delete persistedCreature.pendingAttachmentUrl;
      await this.database.creatures.set(creature.id, persistedCreature, { flush: true });
      await this.users.update(userId, (user) => {
        if (!user.eggs.some((entry) => entry.id === prepared.egg.id)) return;
        user.eggs = user.eggs.filter((entry) => entry.id !== prepared.egg.id);
        user.inventory.push(creature.id);
        user.statistics.hatches += 1;
      }, { flush: true });
      await this.quests.record(userId, 'hatch', creature);
      return { ok: true, creature };
    } finally {
      this.hatchLocks.delete(userId);
    }
  }
}
