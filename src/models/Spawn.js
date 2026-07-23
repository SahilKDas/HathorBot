import { randomUUID } from 'node:crypto';

export function spawnKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

export function createSpawn({ guildId, channelId, creature, expiresAt }) {
  return {
    id: randomUUID(),
    guildId,
    channelId,
    creature,
    status: 'active',
    spawnedAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    claimedBy: null,
    claimedAt: null,
  };
}
