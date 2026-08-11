import { EQUIPMENT_SLOTS, ITEMS } from '../data/items.js';
import { recalculateCreature } from './CreatureFactory.js';
import { resolveOwnedCreature } from '../utils/creatures.js';

export class EquipmentService {
  constructor({ database, userService, progressionService, auditService }) {
    this.database = database;
    this.users = userService;
    this.progression = progressionService;
    this.audit = auditService;
    this.locks = new Set();
  }

  async buy(userId, itemId, quantity = 1) {
    const item = ITEMS[String(itemId ?? '').toLowerCase()];
    const count = Math.max(1, Math.min(25, Math.trunc(Number(quantity) || 1)));
    if (!item) return { ok: false, reason: 'That equipment item does not exist.' };
    let result;
    await this.users.update(userId, (user) => {
      const total = item.cost * count;
      if (user.shrimpCoins < total) return void (result = { ok: false, reason: `You need ${total} Shrimp Coins.` });
      user.shrimpCoins -= total;
      user.items[item.id] = (user.items[item.id] ?? 0) + count;
      result = { ok: true, item, count, total };
    }, { flush: true });
    if (result.ok) await this.audit.record('equipment.buy', userId, { itemId: item.id, count, coins: result.total });
    return result;
  }

  async equip(userId, creatureQuery, itemId) {
    if (this.locks.has(userId)) return { ok: false, reason: 'Your equipment inventory is busy.' };
    this.locks.add(userId);
    try {
      const item = ITEMS[String(itemId ?? '').toLowerCase()];
      if (!item || !EQUIPMENT_SLOTS.includes(item.slot)) return { ok: false, reason: 'Choose a Charm or Anklet.' };
      const currentUser = this.users.get(userId);
      const creature = resolveOwnedCreature(this.database, currentUser, creatureQuery);
      if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
      if ((currentUser.items[item.id] ?? 0) < 1) return { ok: false, reason: `You do not own a ${item.name}.` };
      const previousItemId = creature.equipment?.[item.slot] ?? null;

      await this.users.update(userId, (user) => {
        user.items[item.id] -= 1;
        if (user.items[item.id] <= 0) delete user.items[item.id];
        if (previousItemId) user.items[previousItemId] = (user.items[previousItemId] ?? 0) + 1;
      }, { flush: true });
      const equipped = recalculateCreature({
        ...creature,
        equipment: { charm: null, anklet: null, ...(creature.equipment ?? {}), [item.slot]: item.id },
        updatedAt: new Date().toISOString(),
      });
      await this.database.creatures.set(creature.id, equipped, { flush: true });
      await this.audit.record('equipment.equip', userId, { creatureId: creature.id, itemId: item.id, replaced: previousItemId });
      return { ok: true, creature: equipped, item, previousItem: ITEMS[previousItemId] ?? null };
    } finally {
      this.locks.delete(userId);
    }
  }

  async unequip(userId, creatureQuery, slotName) {
    const slot = String(slotName ?? '').toLowerCase();
    if (!EQUIPMENT_SLOTS.includes(slot)) return { ok: false, reason: 'Slot must be charm or anklet.' };
    const currentUser = this.users.get(userId);
    const creature = resolveOwnedCreature(this.database, currentUser, creatureQuery);
    if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
    const itemId = creature.equipment?.[slot];
    if (!itemId) return { ok: false, reason: `That Hathor has no ${slot} equipped.` };
    await this.users.update(userId, (user) => { user.items[itemId] = (user.items[itemId] ?? 0) + 1; }, { flush: true });
    const updated = recalculateCreature({
      ...creature,
      equipment: { charm: null, anklet: null, ...(creature.equipment ?? {}), [slot]: null },
      updatedAt: new Date().toISOString(),
    });
    await this.database.creatures.set(creature.id, updated, { flush: true });
    await this.audit.record('equipment.unequip', userId, { creatureId: creature.id, itemId });
    return { ok: true, creature: updated, item: ITEMS[itemId] };
  }

  async use(userId, creatureQuery, itemId) {
    const item = ITEMS[String(itemId ?? '').toLowerCase()];
    if (!item?.creatureXp) return { ok: false, reason: 'That item is not a consumable Shrimp Treat.' };
    const currentUser = this.users.get(userId);
    const creature = resolveOwnedCreature(this.database, currentUser, creatureQuery);
    if (!creature) return { ok: false, reason: 'That Hathor ID is missing or ambiguous.' };
    if ((currentUser.items[item.id] ?? 0) < 1) return { ok: false, reason: `You do not own a ${item.name}.` };
    await this.users.update(userId, (user) => {
      user.items[item.id] -= 1;
      if (user.items[item.id] <= 0) delete user.items[item.id];
    }, { flush: true });
    const progress = await this.progression.addXp(creature.id, item.creatureXp);
    await this.audit.record('equipment.consume', userId, { creatureId: creature.id, itemId: item.id, xp: item.creatureXp });
    return { ok: true, item, progress };
  }
}
