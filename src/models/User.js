export function createUser(id) {
  return {
    id,
    shrimpCoins: 0,
    xp: 0,
    level: 1,
    inventory: [],
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
  user.eggs = Array.isArray(user.eggs) ? user.eggs : [];
  user.statistics = { ...base.statistics, ...(user.statistics ?? {}) };
  user.cooldowns = { ...(user.cooldowns ?? {}) };
  return user;
}

export function addXp(user, amount) {
  user.xp += amount;
  user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
}
