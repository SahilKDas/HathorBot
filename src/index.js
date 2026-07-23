import { Client, GatewayIntentBits, Partials } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { Database } from './database/Database.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { BreedingService } from './services/BreedingService.js';
import { AssetService } from './services/AssetService.js';
import { DuelService } from './services/DuelService.js';
import { startHealthServer, stopHealthServer } from './services/HealthServer.js';
import { QuestService } from './services/QuestService.js';
import { SpawnService } from './services/SpawnService.js';
import { UserService } from './services/UserService.js';

if (!config.token) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and add your token.');
  process.exitCode = 1;
} else {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const database = new Database(config.dataDir);
  await database.init();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel],
  });
  const users = new UserService(database);
  const assets = new AssetService(path.join(path.resolve(currentDirectory, '..'), 'assets'));
  const quests = new QuestService(users);
  const breeding = new BreedingService({ database, config, userService: users, questService: quests });
  const spawns = new SpawnService({ database, config, assetService: assets, userService: users, questService: quests });
  const duels = new DuelService({ database, userService: users, questService: quests });
  const app = { client, config, database, users, assets, quests, breeding, spawns, duels };

  await loadCommands(client, path.join(currentDirectory, 'commands'), app);
  await loadEvents(client, path.join(currentDirectory, 'events'));

  let stopping = false;
  let healthServer = null;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[system] ${signal} received; flushing JSON stores...`);
    await stopHealthServer(healthServer).catch((error) => console.error('[http] Shutdown failed:', error));
    await database.flushAll().catch((error) => console.error('[database] Final flush failed:', error));
    client.destroy();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('beforeExit', () => database.flushAll());

  await client.login(config.token);
  healthServer = await startHealthServer({ client, ...config.http });
}
