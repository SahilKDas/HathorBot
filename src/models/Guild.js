export function normalizeGuild(value, id, defaultChannelIds = []) {
  const isNew = !value;
  return {
    id,
    spawnChannelIds: Array.isArray(value?.spawnChannelIds) ? value.spawnChannelIds : [...defaultChannelIds],
    spawnAllChannels: typeof value?.spawnAllChannels === 'boolean'
      ? value.spawnAllChannels
      : isNew && defaultChannelIds.length === 0,
    activity: {
      count: Number(value?.activity?.count) || 0,
      target: Number(value?.activity?.target) || null,
    },
    world: value?.world && typeof value.world === 'object' ? { ...value.world } : null,
    createdAt: value?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
