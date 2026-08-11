import { recalculateCreature } from './CreatureFactory.js';
import { resolveOwnedCreature } from '../utils/creatures.js';

export const ASCENSION_SIGIL_COST = 3;

export class AscensionService {
  constructor({ database, userService, auditService }) {
    this.database = database;
    this.users = userService;
    this.audit = auditService;
    this.locks = new Set();
  }

  async ascend(userId, creatureQuery) {
    if (this.locks.has(userId)) return { ok: false, reason: 'An Ascension is already in progress.' };
    this.locks.add(userId);
    try {
      const user = this.users.get(userId);
      const creature = resolveOwnedCreature(this.database, user, creatureQuery);
      if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
      if (creature.ascended) return { ok: false, reason: `${creature.species} has already Ascended.` };
      if (user.ascensionSigils < ASCENSION_SIGIL_COST) {
        return { ok: false, reason: `Ascension requires ${ASCENSION_SIGIL_COST} Quest Sigils. You have ${user.ascensionSigils}.` };
      }
      await this.users.update(userId, (current) => { current.ascensionSigils -= ASCENSION_SIGIL_COST; }, { flush: true });
      const ascended = recalculateCreature({
        ...creature,
        ascended: true,
        ascendedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await this.database.creatures.set(creature.id, ascended, { flush: true });
      await this.audit.record('creature.ascend', userId, { creatureId: creature.id, species: creature.species });
      return { ok: true, creature: ascended, sigilsRemaining: user.ascensionSigils - ASCENSION_SIGIL_COST };
    } finally {
      this.locks.delete(userId);
    }
  }
}
