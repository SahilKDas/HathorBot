# HathorBot — Flamingo RPG

A modular Discord.js v14 collection RPG built around completely original flamingo creatures. Chat activity attracts wild Flamingos, players catch them from hints, breed inherited offspring in Daycare, finish daily quests, and duel other flocks.

## Features

- Original elemental species across Common, Uncommon, Rare, Epic, Legendary, and Mythic tiers
- Weighted spawns after a configurable 20–50 non-command messages
- Random 0–10 HP, Attack, Defense, and Speed IVs, plus Shiny and Gigantamax mutations
- A universal creature level ceiling of 1024
- Both slash commands and `!` prefix commands
- Sortable, paginated collection box
- Daycare pairs, time-or-message Egg production, time-or-message hatching, IV inheritance, and boosted mutation odds
- Daily quests, Shrimp Coins, trainer XP/levels, and functional duels
- One permanent, canonical transparent image per species; no image generation during gameplay
- An original opaque Daycare environment used by the Daycare status command
- Optimized local JSON storage with separate files, in-memory reads, serialized mutations, debounced writes, atomic replacement, and `.bak` recovery

## Requirements

- Node.js 20 or newer (for built-in `fetch`, `structuredClone`, and the test runner)
- A Discord application and bot token
- The **Message Content Intent** enabled in the Discord Developer Portal if prefix commands and activity spawning are used

## Setup

```bash
npm install
copy .env.example .env
npm run deploy
npm start
```

On macOS/Linux, use `cp .env.example .env`. Put `DISCORD_TOKEN` and `CLIENT_ID` in `.env`. During development, set `GUILD_ID` so slash-command updates appear immediately; without it, commands are registered globally and Discord may take time to publish them.

The bot needs View Channel, Send Messages, Embed Links, Attach Files, Read Message History, and Use Application Commands in its spawn channels.

The process also exposes `GET /` and `GET /health` on `PORT` (4010 by default) for uptime checks. Change `HOST` if it should only listen on a particular interface.

## Commands

| Slash command | Prefix equivalent | Purpose |
|---|---|---|
| `/catch name` | `!catch name` | Catch the current wild Flamingo |
| `/hathordex` | `!hathordex`, `!dex` | Browse species, filters, hints, and base stats |
| `/box [sort] [page]` | `!box iv 1`, `!flamingos` | View the player’s flock |
| `/daycare place first second` | `!daycare place id id` | Place two owned Flamingos in Daycare |
| `/daycare status` | `!daycare status` | View pair and Egg progress |
| `/daycare collect` | `!daycare collect` | Collect a ready Egg |
| `/daycare hatch egg` | `!daycare hatch egg-id` | Hatch a ready Egg |
| `/quest [action]` | `!quest`, `!quest claim` | View or claim the daily quest |
| `/profile` | `!profile` | View level, wallet, and statistics |
| `/duel opponent` | `!duel @user` | Duel using each player’s strongest creature |
| `/spawn-channel ...` | `!spawn-channel ...` | Configure designated channels or allow all (Manage Server) |
| `/spawn-now` | `!spawn-now` | Force a test spawn (Manage Server) |

The eight-character IDs shown by `/box` and `/daycare status` are accepted anywhere a creature or Egg ID is required.

## Static artwork pipeline

Gameplay never calls an image-generation service. Each species maps to one canonical file under `assets/hathors`, and every spawn, capture, hatch, and detailed Hathordex entry reuses that file. The Daycare status view uses the opaque `assets/daycare/background.png` environment.

Creature source renders are generated once into the ignored `.tmp/imagegen/source/hathors` directory. Background removal is a separate build-time operation using remove.bg:

```env
REMOVE_BG_API_KEY=your-remove-bg-api-key
```

```bash
npm run assets:remove-bg
```

The command uploads only the 18 creature source renders and writes transparent PNGs to `assets/hathors`. It never uploads or modifies the Daycare background, and the API key is never used by the running Discord bot.

## JSON database and data safety

Runtime data lives in:

```text
data/
├── users.json       profiles, inventories, quests, Eggs, Daycare, currency
├── creatures.json   permanent caught and hatched creature instances
├── guilds.json      spawn-channel configuration and activity counters
├── spawns.json      active/caught/expired spawn state
└── meta.json        reserved for migrations and operational metadata
```

Stores never interpret `null` as deletion; physical removal requires an intentional, explicit delete operation. Updates are serialized in process, held in memory for fast reads, written after a short debounce, and flushed immediately for captures/Daycare transitions. Before replacement, the previous file is copied to `filename.json.bak`; a valid backup is loaded if the primary file is corrupt. The process also flushes all dirty stores during graceful shutdown.

Back up the entire `data` directory before schema changes or moving hosts. Do not run multiple bot processes against the same local directory; JSON cannot provide safe cross-process locking.

## Project structure

```text
src/
├── commands/        slash + prefix command modules
├── data/            species, type, and rarity definitions
├── database/        cached, atomic multi-file JSON persistence
├── events/          Discord event modules
├── handlers/        dynamic command and event loaders
├── models/          durable record schemas/defaults
├── services/        spawning, static assets, breeding, quests, users, duels
├── structures/      shared command context adapter
├── utils/           random and text helpers
├── config.js
└── index.js
scripts/deploy-commands.js
test/
```

## Verification

```bash
npm test
```

HathorBot © 2026 Sahil Das, licensed under [CC BY-NC-SA 4.0](LICENSE.md).
