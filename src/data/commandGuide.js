export const COMMAND_GUIDE = Object.freeze([
  {
    name: 'help', category: 'Getting started', summary: 'Open the complete command guide.',
    slash: ['/help', '/help command:<command>'], prefix: ['{p}help', '{p}help <command-or-alias>'], aliases: [],
    details: 'With no argument, lists every command. Give a command name to open its focused guide, including syntax, aliases, permissions, and important behavior.',
  },
  {
    name: 'story', category: 'Getting started', summary: 'Play The Croaking Crown solo campaign.',
    slash: ['/story begin|status|ending', '/story explore [difficulty]', '/story choose option:<a-e>', '/story journal|endings [page]', '/story echo', '/story catalyst creature:<ID>'], prefix: ['{p}story begin|status|ending', '{p}story explore [story|normal|challenge]', '{p}story choose <a-e>', '{p}story journal|endings [page]', '{p}story echo', '{p}story catalyst <ID>'], aliases: ['campaign', 'croak', 'croakingcrown'],
    details: 'A persistent, fully solo campaign with ten major decisions, consequences across 24 biomes, 99 canonical endings, coin/XP encounters, milestone Hathors, Gigantamax Catalysts, and five Fractured Echoes leading to 110%.',
  },
  {
    name: 'catch', category: 'Collection', summary: 'Catch the active wild Hathor.',
    slash: ['/catch name:<species>'], prefix: ['{p}catch <species>'], aliases: ['c'],
    details: 'Use the exact species name shown by the spawn hint. The first correct guess claims the Hathor, adds it to your box, and awards 25 Shrimp Coins. Server channels only; names are case-insensitive.',
  },
  {
    name: 'hathordex', category: 'Collection', summary: 'Browse the 50-species bestiary.',
    slash: ['/hathordex [name] [type] [rarity] [page]'], prefix: ['{p}hathordex [species|type|rarity] [page]'], aliases: ['h', 'dex', 'bestiary'],
    details: 'A species name opens its art, hint, type, rarity, description, and base stats. Type and rarity filter the six-entry pages; prefix arguments and names are case-insensitive.',
  },
  {
    name: 'box', category: 'Collection', summary: 'Browse your caught Hathors.',
    slash: ['/box [sort:iv|rarity|level] [page]'], prefix: ['{p}box [iv|rarity|level] [page]'], aliases: ['flamingos', 'inventory'],
    details: 'Shows 10 Hathors per page with short ID, forms, type, rarity, IV percentage, level progress, and equipment. Default sorting is highest IV; short IDs work in every creature command.',
  },
  {
    name: 'profile', category: 'Progression', summary: 'View your trainer overview.',
    slash: ['/profile'], prefix: ['{p}profile'], aliases: ['bal', 'balance'],
    details: 'Displays Trainer level/XP, Shrimp Coins, Quest Sigils, Gigantamax Catalysts, collection and Egg counts, Daycare slots, story completion/endings, team size, items, catches, hatches, wins, and losses.',
  },
  {
    name: 'quest', category: 'Progression', summary: 'View or claim the daily quest.',
    slash: ['/quest [action:view|claim]'], prefix: ['{p}quest [view|claim]'], aliases: ['daily'],
    details: 'View shows the objective, progress, rewards, and reset state. Claim after completion for Shrimp Coins, Trainer XP, team XP, one Shrimp Treat, and one Quest Sigil. Quests reset at 00:00 UTC.',
  },
  {
    name: 'daycare', category: 'Progression', summary: 'Breed Hathors and hatch inherited offspring.',
    slash: ['/daycare place first:<ID> second:<ID>', '/daycare status', '/daycare collect', '/daycare hatch egg:<ID>'], prefix: ['{p}daycare place <first-ID> <second-ID>', '{p}daycare status|collect', '{p}daycare hatch <egg-ID>'], aliases: ['breed'],
    details: 'Place two different owned Hathors, then wait for either the configured timer or message target. Collect the ready Egg, wait again, and hatch it. Offspring inherit parent IVs/types and can mutate. The 75% story reward unlocks a second pair slot; collect accepts an optional pair ID.',
  },
  {
    name: 'team', category: 'Teams and battles', summary: 'Manage your six-Hathor battle team.',
    slash: ['/team view', '/team add|remove|lead creature:<ID>', '/team clear'], prefix: ['{p}team view', '{p}team add|remove|lead <ID>', '{p}team clear'], aliases: ['party'],
    details: 'Add owned Hathors up to six slots, remove members, move one into the lead position, or clear the team. The first team member enters battle first.',
  },
  {
    name: 'duel', category: 'Teams and battles', summary: 'Start or manage a turn-based battle.',
    slash: ['/duel challenge opponent:<trainer>', '/duel status', '/duel forfeit'], prefix: ['{p}duel @trainer', '{p}duel status|forfeit'], aliases: ['battle'],
    details: 'Both trainers need valid teams. The opponent confirms the challenge, then players use the battle controls for moves, guarding, switching, cooldowns, and statuses. Status redraws the battle; forfeit records a loss.',
  },
  {
    name: 'equipment', category: 'Items', summary: 'Buy, equip, and consume items.',
    slash: ['/equipment shop|inventory', '/equipment buy item:<item> [quantity:1-25]', '/equipment equip creature:<ID> item:<gear>', '/equipment unequip creature:<ID> slot:<charm|anklet>', '/equipment use creature:<ID> item:shrimp_treat'], prefix: ['{p}equipment shop|inventory', '{p}equipment buy <item-ID> [quantity]', '{p}equipment equip <Hathor-ID> <item-ID>', '{p}equipment unequip <Hathor-ID> <charm|anklet>', '{p}equipment use <Hathor-ID> shrimp_treat'], aliases: ['items', 'gear'],
    details: 'Shop lists prices and effects; inventory lists owned quantities. A Hathor can wear one Charm and one Anklet, with replaced gear returned. Shrimp Treats are consumed for 250 creature XP. Prefix item IDs use names such as coral_charm.',
  },
  {
    name: 'ascend', category: 'Progression', summary: 'Unlock a permanent Ascended Form.',
    slash: ['/ascend creature:<ID>'], prefix: ['{p}ascend <Hathor-ID>'], aliases: [],
    details: 'Spend three Quest Sigils on an owned, non-Ascended Hathor. Ascension is permanent and increases its combat stats by 12%.',
  },
  {
    name: 'world', category: 'World', summary: 'View or rotate current world conditions.',
    slash: ['/world [action:view|rotate]'], prefix: ['{p}world [view|rotate]'], aliases: ['weather', 'biome', 'environment', 'climate'],
    details: 'Shows the active biome, secondary rain environment, combined elemental spawn weights, and time until rotation. Rotate immediately requires Manage Server.',
  },
  {
    name: 'hathorweatherlist', category: 'World', summary: 'Browse every biome and rain environment.',
    slash: ['/hathorweatherlist [entry] [category:all|biomes|rain] [page]'], prefix: ['{p}hathorweatherlist [entry|biomes|rain] [page]'], aliases: ['hwl', 'weatherlist', 'worldatlas'],
    details: 'The overview covers all 24 biomes and seven rain environments. Detail pages explain elemental multipliers, rare-tier pressure, and compatible biome/environment combinations. Names and categories are case-insensitive.',
  },
  {
    name: 'trade', category: 'Economy', summary: 'Offer a confirmed player-to-player trade.',
    slash: ['/trade trainer:<user> give:<your-ID> [request:their-ID] [coins]'], prefix: ['{p}trade @trainer <your-ID> [their-ID] [coins]'], aliases: [],
    details: 'Offers one owned Hathor, optionally requesting one in return and/or adding Shrimp Coins. Nothing transfers until the other trainer confirms; bots cannot trade.',
  },
  {
    name: 'market', category: 'Economy', summary: 'Use the audited Hathor marketplace.',
    slash: ['/market browse', '/market list creature:<ID> price:<coins>', '/market buy listing:<ID>', '/market cancel listing:<ID>'], prefix: ['{p}market browse', '{p}market list <Hathor-ID> <price>', '{p}market buy|cancel <listing-ID>'], aliases: ['bazaar'],
    details: 'Browse active listings, create a confirmed listing, open a purchase confirmation, or cancel your own draft/active listing. Short listing IDs are accepted; completed transfers and currency changes are audited.',
  },
  {
    name: 'spawn-channel', category: 'Server administration', summary: 'Configure activity-spawn channels.',
    slash: ['/spawn-channel add|remove channel:<channel>', '/spawn-channel all|list'], prefix: ['{p}spawn-channel add|remove #channel', '{p}spawn-channel all|list'], aliases: [],
    details: 'Manage Server only. Add or remove designated text channels, allow every text channel with all, or inspect the current setup with list. An empty designated list pauses activity spawning.',
  },
  {
    name: 'spawn-now', category: 'Server administration', summary: 'Force a wild Hathor encounter.',
    slash: ['/spawn-now'], prefix: ['{p}spawn-now'], aliases: [],
    details: 'Manage Server only. Immediately attempts a biome-backed spawn in the current channel; it will not replace an encounter that is already active there.',
  },
]);

export function findCommandGuide(value) {
  const query = String(value ?? '').trim().toLowerCase();
  return COMMAND_GUIDE.find((entry) => entry.name === query || entry.aliases.includes(query)) ?? null;
}
