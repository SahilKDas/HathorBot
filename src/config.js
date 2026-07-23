import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function integer(name, fallback, minimum = 0) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function csv(name) {
  return (process.env[name] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

export const config = Object.freeze({
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  prefix: process.env.PREFIX || '!',
  http: {
    port: integer('PORT', 4010, 0),
    host: process.env.HOST || '0.0.0.0',
  },
  dataDir: path.join(rootDir, 'data'),
  spawn: {
    minMessages: integer('SPAWN_MIN_MESSAGES', 20, 1),
    maxMessages: integer('SPAWN_MAX_MESSAGES', 50, 1),
    defaultChannelIds: csv('SPAWN_CHANNEL_IDS'),
  },
  daycare: {
    breedMs: integer('DAYCARE_BREED_HOURS', 6, 0) * 60 * 60 * 1000,
    breedMessages: integer('DAYCARE_BREED_MESSAGES', 150, 1),
    hatchMs: integer('EGG_HATCH_MINUTES', 30, 0) * 60 * 1000,
    hatchMessages: integer('EGG_HATCH_MESSAGES', 25, 1),
  },
  image: {
    provider: process.env.IMAGE_PROVIDER || 'disabled',
    endpoint: process.env.IMAGE_API_URL || '',
    apiKey: process.env.IMAGE_API_KEY || '',
    responsePath: process.env.IMAGE_RESPONSE_PATH || 'data.0.url',
    authHeader: process.env.IMAGE_AUTH_HEADER || 'Authorization',
    authPrefix: process.env.IMAGE_AUTH_PREFIX ?? 'Bearer',
    timeoutMs: integer('IMAGE_TIMEOUT_MS', 45_000, 1000),
    width: 768,
    height: 768,
  },
});

if (config.spawn.maxMessages < config.spawn.minMessages) {
  config.spawn.maxMessages = config.spawn.minMessages;
}
