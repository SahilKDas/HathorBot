export function createUser(id) {
  return {
    id,
    shrimpCoins: 0,
    xp: 0,
    level: 1,
    inventory: [],
    team: [],
    items: {},
    ascensionSigils: 0,
    gigantamaxCatalysts: 0,
    daycareSlots: 1,
    extraDaycares: [],
    eggs: [],
    daycare: null,
    statistics: { catches: 0, hatches: 0, duelWins: 0, duelLosses: 0 },
    dailyQuest: null,
    cooldowns: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeUser(value, id) {
  const base = createUser(id);
  const user = { ...base, ...(value ?? {}) };
  user.inventory = Array.isArray(user.inventory) ? user.inventory : [];
  user.team = [...new Set(Array.isArray(user.team) ? user.team.filter((id) => typeof id === 'string') : [])].slice(0, 6);
  user.items = Object.fromEntries(Object.entries(user.items ?? {})
    .map(([id, count]) => [id, Math.max(0, Math.trunc(Number(count) || 0))])
    .filter(([, count]) => count > 0));
  user.ascensionSigils = Math.max(0, Math.trunc(Number(user.ascensionSigils) || 0));
  user.gigantamaxCatalysts = Math.max(0, Math.trunc(Number(user.gigantamaxCatalysts) || 0));
  user.daycareSlots = Math.max(1, Math.min(2, Math.trunc(Number(user.daycareSlots) || 1)));
  user.extraDaycares = Array.isArray(user.extraDaycares) ? user.extraDaycares.filter((daycare) => daycare && typeof daycare === 'object') : [];
  if (user.daycare && !user.daycare.id) user.daycare.id = 'primary';
  user.extraDaycares = user.extraDaycares.slice(0, Math.max(0, user.daycareSlots - 1)).map((daycare, index) => ({
    ...daycare,
    id: daycare.id ?? `extra-${index + 1}`,
  }));
  user.eggs = Array.isArray(user.eggs) ? user.eggs : [];
  user.statistics = { ...base.statistics, ...(user.statistics ?? {}) };
  user.cooldowns = { ...(user.cooldowns ?? {}) };
  return user;
}

export function addXp(user, amount) {
  user.xp += amount;
  user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
}
