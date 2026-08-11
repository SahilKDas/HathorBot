export function resolveOwnedCreature(database, user, query) {
  const normalized = String(query ?? '').trim().toLowerCase();
  if (!normalized) return null;
  const matches = user.inventory.filter((id) => id.toLowerCase() === normalized || id.toLowerCase().startsWith(normalized));
  if (matches.length !== 1) return null;
  const creature = database.creatures.get(matches[0]);
  return creature?.ownerId === user.id && !creature.archived ? creature : null;
}

export function ownedCreatures(database, user) {
  return user.inventory
    .map((id) => database.creatures.get(id))
    .filter((creature) => creature?.ownerId === user.id && !creature.archived);
}

export function removeCreatureFromUser(user, creatureId) {
  user.inventory = user.inventory.filter((id) => id !== creatureId);
  user.team = user.team.filter((id) => id !== creatureId);
  if (user.daycare?.parentIds?.includes(creatureId)) user.daycare = null;
  user.extraDaycares = (user.extraDaycares ?? []).filter((daycare) => !daycare.parentIds?.includes(creatureId));
}
