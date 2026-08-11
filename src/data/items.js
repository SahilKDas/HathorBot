export const EQUIPMENT_SLOTS = Object.freeze(['charm', 'anklet']);

export const ITEMS = Object.freeze({
  coral_charm: {
    id: 'coral_charm',
    name: 'Coral Charm',
    slot: 'charm',
    cost: 450,
    description: 'Raises maximum HP by 5%.',
    stats: { hp: 0.05 },
  },
  razor_charm: {
    id: 'razor_charm',
    name: 'Razor Charm',
    slot: 'charm',
    cost: 550,
    description: 'Raises Attack by 5%.',
    stats: { attack: 0.05 },
  },
  focus_charm: {
    id: 'focus_charm',
    name: 'Focus Charm',
    slot: 'charm',
    cost: 600,
    description: 'Raises move accuracy by 5 percentage points.',
    accuracy: 5,
  },
  shell_anklet: {
    id: 'shell_anklet',
    name: 'Shell Anklet',
    slot: 'anklet',
    cost: 450,
    description: 'Raises Defense by 5%.',
    stats: { defense: 0.05 },
  },
  gale_anklet: {
    id: 'gale_anklet',
    name: 'Gale Anklet',
    slot: 'anklet',
    cost: 550,
    description: 'Raises Speed by 5%.',
    stats: { speed: 0.05 },
  },
  shrimp_treat: {
    id: 'shrimp_treat',
    name: 'Shrimp Treat',
    slot: 'consumable',
    cost: 175,
    description: 'Gives one Hathor 250 creature XP.',
    creatureXp: 250,
  },
});

export function equippedStatMultiplier(equipment = {}, stat) {
  return EQUIPMENT_SLOTS.reduce((multiplier, slot) => {
    const item = ITEMS[equipment?.[slot]];
    return multiplier + Number(item?.stats?.[stat] ?? 0);
  }, 1);
}

export function equippedAccuracyBonus(equipment = {}) {
  return EQUIPMENT_SLOTS.reduce((bonus, slot) => bonus + Number(ITEMS[equipment?.[slot]]?.accuracy ?? 0), 0);
}
