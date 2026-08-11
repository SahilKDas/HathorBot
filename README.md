# HathorBot — Flamingo RPG

A modular Discord.js v14 collection RPG built around 50 original flamingo creatures called Hathors. Chat activity attracts wild Hathors; players catch, breed, train, equip, ascend, battle, trade, and sell them.

## Features

- 50 original species across eight elemental types and six weighted rarity tiers
- Permanent transparent artwork per species with no image generation during gameplay
- Permanent original artwork for all 24 biomes plus a Daycare background
- Poketwo-style spawn and Daycare cards composited in memory, never saved as per-encounter files
- Random 0–10 HP, Attack, Defense, and Speed IVs, plus Shiny and Gigantamax mutations
- Six-Hathor player teams and persisted, turn-based battles
- Elemental strengths and weaknesses, move accuracy, cooldowns, guarding, switching, and eight status effects
- Creature XP and levels earned from battles, quests, Daycare, and Shrimp Treats
- Daily quests that award currency, Trainer XP, team XP, items, and Quest Sigils
- Quest-powered Ascended Forms with a permanent 12% combat-stat bonus
- 24 world biomes plus seven compatible rain environments that combine to modify elemental and high-rarity spawn odds
- The Croaking Crown: a fully solo, ten-decision campaign with persistent biome consequences, 99 endings, and 110% postgame mastery
- Charms, Anklets, and consumable Shrimp Treats
- Confirmed player trades and a confirmed marketplace with durable audit records
- Daycare breeding, inherited IVs, Eggs, mutations, and parent/newborn XP
- Multi-file local JSON storage with serialized mutations, atomic replacement, and `.bak` recovery
- Loopback-only raw JSON and a visual developer dashboard with bounded trainer/Hathor editing and cheated Hathor grants

## Requirements and setup

- Node.js 20 or newer
- A Discord application and bot token
- Message Content Intent enabled for prefix commands and activity spawning

```powershell
npm install
copy .env.example .env
npm run deploy
npm start
```

Set `DISCORD_TOKEN` and `CLIENT_ID` in `.env`. Set `GUILD_ID` during development so slash-command changes register immediately. The bot requires View Channel, Send Messages, Embed Links, Attach Files, Read Message History, and Use Application Commands.

The health server uses port 4010 by default:

- `http://localhost:4010/health` — process and Discord status
- `http://localhost:4010/data` — readable live JSON snapshot
- `http://localhost:4010/dev` — visual developer console

The data and developer routes reject non-loopback clients. Never publish them through a reverse proxy.

## Commands

Every command works as a Discord slash command and with the configured prefix, which defaults to `!`. In the syntax below, `<angle brackets>` are required and `[square brackets]` are optional. Command names, aliases, species names, actions, filters, and short IDs are case-insensitive.

Use `/help` or `!help` for the complete in-Discord guide. Use `/help command:<command>` or `!help <command-or-alias>` to open one focused entry.

### `/help`

- Slash: `/help` or `/help command:<command>`
- Prefix: `!help` or `!help <command-or-alias>`
- Shows syntax, aliases, permissions, and behavior for all registered commands. A command argument opens its focused documentation.

### `/story`

- Slash: `/story begin`, `/story status`, `/story explore [difficulty]`, `/story choose option:<a-e>`
- Slash: `/story journal [page]`, `/story ending`, `/story endings [page]`, `/story echo`, `/story catalyst creature:<ID>`
- Prefix: `!story begin|status|ending`, `!story explore [story|normal|challenge]`, `!story choose <a-e>`, `!story journal|endings [page]`, `!story echo`, `!story catalyst <ID>`
- Aliases: `!campaign`, `!croak`, `!croakingcrown`
- Runs the persistent Croaking Crown campaign entirely solo. Each of ten chapters has three exploration encounters followed by a permanent decision. Story difficulty always succeeds with companion help; Normal and Challenge require increasing team power and award more coins.
- Decisions change eight hidden tendencies, the political state of all 24 biomes, companions, and one of 99 endings calculated from three Crown fates, three world states, and eleven player legacies. The three choices in chapters 1-9 and five finale choices create 98,415 exact decision sequences that merge into those 99 canonical conclusions. The Hall of Ninety-Nine Doors opens at 100%; five Fractured Echoes raise completion to 110% without requiring every ending.
- Milestones automatically award coins, equipment, a second Daycare pair slot, route-specific Legendary and Gigantamax Hathors, two usable Gigantamax Catalysts, a hatchable high-IV Mythic Story Egg, and the Worldwalker reward. Use `/story catalyst` to transform one eligible owned Hathor.

### `/catch`

- Slash: `/catch name:<species>`
- Prefix: `!catch <species>`
- Alias: `!c`
- Catches the active wild Hathor in the current server channel. The first exact, case-insensitive species guess wins, adds the creature to the trainer's box, and awards 25 Shrimp Coins.

### `/hathordex`

- Slash: `/hathordex [name] [type] [rarity] [page]`
- Prefix: `!hathordex [species|type|rarity] [page]`
- Aliases: `!h`, `!dex`, `!bestiary`
- A species name opens its permanent art, spawn hint, description, type, rarity, and base stats. Type and rarity filter the six-entry catalog pages. Example: `!h coralume`.

### `/box`

- Slash: `/box [sort:iv|rarity|level] [page]`
- Prefix: `!box [iv|rarity|level] [page]`
- Aliases: `!flamingos`, `!inventory`
- Shows 10 owned Hathors per page, including short ID, forms, type, rarity, IV percentage, level/XP, and equipment. Sorting defaults to highest IV. Short IDs shown here work anywhere a Hathor ID is requested.

### `/profile`

- Slash: `/profile`
- Prefix: `!profile`
- Aliases: `!bal`, `!balance`
- Displays Trainer level and XP, Shrimp Coins, Quest Sigils, Gigantamax Catalysts, story completion and endings, collection and Egg counts, Daycare slots, team size, item total, catches, hatches, duel wins, and duel losses.

### `/quest`

- Slash: `/quest [action:view|claim]`
- Prefix: `!quest [view|claim]`
- Alias: `!daily`
- View shows the daily objective, progress, rewards, and claim state. Claim after completion for Shrimp Coins, Trainer XP, team XP, one Shrimp Treat, and one Quest Sigil. The daily quest resets at 00:00 UTC.

### `/daycare`

- Slash: `/daycare place first:<ID> second:<ID>`, `/daycare status`, `/daycare collect [pair]`, `/daycare hatch egg:<ID>`
- Prefix: `!daycare place <first-ID> <second-ID>`, `!daycare status`, `!daycare collect [pair-ID]`, `!daycare hatch <egg-ID>`
- Alias: `!breed`
- Place two different owned Hathors in Daycare. A pair produces an Egg after either the configured timer or message target. Collect the Egg, wait for its own timer or message target, then hatch it. Offspring inherit parent IVs and typing and have mutation chances. Status shows every pair and Egg and renders the primary pair over the Daycare background. Story completion at 75% permanently unlocks a second simultaneous pair slot.

### `/team`

- Slash: `/team view`, `/team add creature:<ID>`, `/team remove creature:<ID>`, `/team lead creature:<ID>`, `/team clear`
- Prefix: `!team view`, `!team add|remove|lead <ID>`, `!team clear`
- Alias: `!party`
- Builds a battle team of up to six owned Hathors. `lead` moves a member into the first slot, which is the creature that enters battle first.

### `/duel`

- Slash: `/duel challenge opponent:<trainer>`, `/duel status`, `/duel forfeit`
- Prefix: `!duel @trainer`, `!duel status`, `!duel forfeit`
- Alias: `!battle`
- Challenges another human trainer; both players need valid teams. After confirmation, button controls handle attacks, status moves, guarding, switching, and cooldowns. `status` redraws the current battle and `forfeit` records a loss.

### `/equipment`

- Slash: `/equipment shop`, `/equipment inventory`, `/equipment buy item:<item> [quantity:1-25]`
- Slash: `/equipment equip creature:<ID> item:<gear>`, `/equipment unequip creature:<ID> slot:<charm|anklet>`, `/equipment use creature:<ID> item:shrimp_treat`
- Prefix: `!equipment shop|inventory`, `!equipment buy <item-ID> [quantity]`, `!equipment equip <Hathor-ID> <item-ID>`, `!equipment unequip <Hathor-ID> <charm|anklet>`, `!equipment use <Hathor-ID> shrimp_treat`
- Aliases: `!items`, `!gear`
- The shop lists item prices/effects and inventory lists owned quantities. Each Hathor has one Charm and one Anklet slot; replacing gear returns the old item. A Shrimp Treat is consumed to grant 250 creature XP. Prefix item IDs use values such as `coral_charm` and `gale_anklet`.

### `/ascend`

- Slash: `/ascend creature:<ID>`
- Prefix: `!ascend <Hathor-ID>`
- Spends three Quest Sigils on an owned Hathor that has not already Ascended. Ascension is permanent and raises its combat stats by 12%.

### `/world`

- Slash: `/world [action:view|rotate]`
- Prefix: `!world [view|rotate]`
- Aliases: `!weather`, `!biome`, `!environment`, `!climate`
- Shows the current biome, secondary rain environment, combined elemental spawn multipliers, and remaining rotation time. `rotate` immediately changes conditions and requires Manage Server.

### `/hathorweatherlist`

- Slash: `/hathorweatherlist [entry] [category:all|biomes|rain] [page]`
- Prefix: `!hathorweatherlist [entry|biomes|rain] [page]`
- Aliases: `!hwl`, `!weatherlist`, `!worldatlas`
- Browses all 24 biomes and seven rain environments. Detailed entries explain elemental spawn multipliers, rare-tier pressure, and compatible biome/environment combinations. Example: `!hwl crystal dunes`.

### `/trade`

- Slash: `/trade trainer:<user> give:<your-ID> [request:their-ID] [coins]`
- Prefix: `!trade @trainer <your-ID> [their-ID] [coins]`
- Offers one owned Hathor, optionally requesting one from the other trainer and/or adding Shrimp Coins. No assets move until the receiving trainer confirms. Bots cannot trade.

### `/market`

- Slash: `/market browse`, `/market list creature:<ID> price:<coins>`, `/market buy listing:<ID>`, `/market cancel listing:<ID>`
- Prefix: `!market browse`, `!market list <Hathor-ID> <price>`, `!market buy|cancel <listing-ID>`
- Alias: `!bazaar`
- Browses active listings, creates a confirmed sale listing, opens a purchase confirmation, or cancels the caller's own draft/active listing. Short listing IDs work. Completed ownership and currency transfers are audited.

### `/spawn-channel`

- Slash: `/spawn-channel add|remove channel:<channel>`, `/spawn-channel all`, `/spawn-channel list`
- Prefix: `!spawn-channel add|remove #channel`, `!spawn-channel all|list`
- Permission: Manage Server
- Adds or removes designated activity-spawn channels, enables every text channel with `all`, or displays the current configuration. An empty designated list pauses activity spawning.

### `/spawn-now`

- Slash: `/spawn-now`
- Prefix: `!spawn-now`
- Permission: Manage Server
- Immediately attempts a biome-backed wild spawn in the current channel for testing. It does not replace an encounter already active in that channel.

## Battle rules

Every elemental type has an accurate basic attack, a stronger typed move, a status move, and Plume Guard. Strong moves and utility moves have cooldowns. Type advantages deal 1.5× damage and disadvantages deal 0.67× damage. Burned, Soaked, Shaken, Rooted, Dazed, Windswept, Frozen, and Paralyzed each change battle behavior. Knocked-out team members are replaced automatically; trainers can switch manually unless Rooted.

Winners earn 100 Shrimp Coins and 180 team XP. Losing teams still earn 20 coins and 90 team XP.

## JSON database

Runtime files are ignored by Git and stored separately:

```text
data/
├── users.json       profiles, teams, items, quests, Eggs, Daycare, currency
├── creatures.json   caught and hatched Hathor instances
├── guilds.json      spawn settings, activity, biome, and rain environment
├── spawns.json      active/caught/expired spawn state
├── battles.json     pending, active, and completed turn-based battles
├── trades.json      confirmed trade lifecycle
├── market.json      draft, active, sold, and cancelled listings
├── audit.json       economy, battle, equipment, Ascension, and developer events
├── stories.json     Croaking Crown choices, biome states, endings, and postgame
└── meta.json        reserved migrations and operational metadata
```

Stores never interpret `null` as deletion. Updates are serialized, cached for fast reads, written atomically, and backed up to `filename.json.bak`. Back up the whole `data` directory before migrations, and never run two bot processes against the same directory.

## Developer dashboard safety

The dashboard can edit only these fields or perform these explicit actions:

- Trainers: Shrimp Coins, Trainer XP, Quest Sigils, Gigantamax Catalysts, Daycare pair slots, item counts, and gameplay statistics
- Hathors: level, creature XP, IVs, Shiny, Gigantamax, Ascended
- Grants: add a chosen species to an existing trainer with bounded level, IV, and form fields

All values are bounded, creature stats are recalculated server-side, non-Solstilt IVs remain capped at 10, and edits create audit entries. There are no dashboard delete endpoints.

The Storylines tab provides a read-only campaign overview with completion, chapter, ending, discovered doors, and Fractured Echo progress. Full choice histories and biome states remain available in the loopback-only `/data` snapshot.

## Project structure

```text
src/
├── commands/        slash and prefix command modules
├── dashboard/       dependency-free local developer UI
├── data/            species, items, battles, worlds, rarity, and type definitions
├── database/        cached atomic JSON persistence
├── events/          Discord event modules
├── handlers/        dynamic command and event loaders
├── models/          durable record defaults and normalization
├── services/        game systems and local HTTP services
├── structures/      shared command context adapter
└── utils/           random, text, and creature helpers
```

## Verification

```powershell
npm run build
npm test
```

HathorBot © 2026 Sahil Das, licensed under [CC BY-NC-SA 4.0](LICENSE.md).
