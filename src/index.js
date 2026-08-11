import { Client, GatewayIntentBits, Partials } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { Database } from './database/Database.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { BreedingService } from './services/BreedingService.js';
import { AssetService } from './services/AssetService.js';
import { AscensionService } from './services/AscensionService.js';
import { AuditService } from './services/AuditService.js';
import { BattleService } from './services/BattleService.js';
import { CreatureProgressionService } from './services/CreatureProgressionService.js';
import { EquipmentService } from './services/EquipmentService.js';
import { startHealthServer, stopHealthServer } from './services/HealthServer.js';
import { MarketplaceService } from './services/MarketplaceService.js';
import { QuestService } from './services/QuestService.js';
import { SpawnService } from './services/SpawnService.js';
import { StoryService } from './services/StoryService.js';
import { TeamService } from './services/TeamService.js';
import { TradeService } from './services/TradeService.js';
import { UserService } from './services/UserService.js';
import { WorldService } from './services/WorldService.js';

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
  const audit = new AuditService(database);
  const progression = new CreatureProgressionService({ database, userService: users });
  const assets = new AssetService(path.join(path.resolve(currentDirectory, '..'), 'assets'));
  const quests = new QuestService({ userService: users, progressionService: progression });
  const worlds = new WorldService({ database, config });
  const teams = new TeamService({ database, userService: users });
  const equipment = new EquipmentService({ database, userService: users, progressionService: progression, auditService: audit });
  const ascension = new AscensionService({ database, userService: users, auditService: audit });
  const breeding = new BreedingService({
    database, config, userService: users, questService: quests, progressionService: progression,
  });
  const spawns = new SpawnService({
    database, config, assetService: assets, userService: users, questService: quests, worldService: worlds,
  });
  const battles = new BattleService({
    database, userService: users, teamService: teams, questService: quests,
    progressionService: progression, auditService: audit,
  });
  const trades = new TradeService({ database, userService: users, auditService: audit });
  const market = new MarketplaceService({ database, userService: users, auditService: audit });
  const stories = new StoryService({
    database, userService: users, progressionService: progression, auditService: audit,
  });
  const app = {
    client, config, database, users, assets, audit, progression, quests, worlds,
    teams, equipment, ascension, breeding, spawns, battles, trades, market, stories,
  };

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
  healthServer = await startHealthServer({ client, database, audit, ...config.http });
}
