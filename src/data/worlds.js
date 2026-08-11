export const BIOMES = Object.freeze({
  skyreach: {
    name: 'Skyreach Cliffs', emoji: '☁️', types: { Air: 3, Electric: 1.3 }, rarityBoost: 1.05,
    environments: ['dry', 'humid', 'frequent_rain', 'snow'], description: 'Knife-edge peaks rise through a permanent silver cloud sea.',
  },
  great_bloom: {
    name: 'Great Bloom', emoji: '🌸', types: { Grass: 3, Water: 1.3 }, rarityBoost: 1.06,
    environments: ['humid', 'frequent_rain', 'rainforest'], description: 'A continent-sized flowering plain erupts in color every season.',
  },
  roseglass_lagoon: {
    name: 'Roseglass Lagoon', emoji: '🌊', types: { Water: 3, Grass: 1.35 }, rarityBoost: 1.02,
    environments: ['humid', 'frequent_rain', 'rainforest', 'acid_rain'], description: 'Pink shallows and crystal reefs turn each tide into stained glass.',
  },
  cinderheart_caldera: {
    name: 'Cinderheart Caldera', emoji: '🌋', types: { Fire: 3, Ground: 1.4 }, rarityBoost: 1.05,
    environments: ['drought', 'dry', 'acid_rain'], description: 'Molten rivers pulse around the basin like a gigantic fiery heart.',
  },
  sunscorch_badlands: {
    name: 'Sunscorch Badlands', emoji: '🏜️', types: { Ground: 3, Fire: 1.35 }, rarityBoost: 1.02,
    environments: ['drought', 'dry'], description: 'Layered red canyons bake beneath two unwavering suns.',
  },
  emerald_crown: {
    name: 'Emerald Crown', emoji: '🌿', types: { Grass: 3, Air: 1.35 }, rarityBoost: 1.04,
    environments: ['humid', 'frequent_rain', 'rainforest'], description: 'Interlocked treetops form a green kingdom high above the soil.',
  },
  starwatch_plateau: {
    name: 'Starwatch Plateau', emoji: '🔭', types: { Cosmic: 3, Air: 1.3 }, rarityBoost: 1.12,
    environments: ['dry', 'snow', 'acid_rain'], description: 'Thin air and black skies reveal stars even at midday.',
  },
  mirrorfall_glacier: {
    name: 'Mirrorfall Glacier', emoji: '🧊', types: { Ice: 3, Water: 1.35 }, rarityBoost: 1.08,
    environments: ['snow', 'dry'], description: 'A frozen waterfall reflects paths into a thousand blue corridors.',
  },
  tempest_shore: {
    name: 'Tempest Shore', emoji: '⚡', types: { Electric: 3, Water: 1.35 }, rarityBoost: 1.08,
    environments: ['frequent_rain', 'humid', 'acid_rain'], description: 'Glass-black waves break beneath a coast of lightning rods.',
  },
  whispering_mangroves: {
    name: 'Whispering Mangroves', emoji: '🪷', types: { Water: 2.6, Grass: 2 }, rarityBoost: 1.05,
    environments: ['rainforest', 'humid', 'frequent_rain'], description: 'Hollow roots carry distant calls through warm jade water.',
  },
  crystal_dunes: {
    name: 'Crystal Dunes', emoji: '💎', types: { Ground: 2.7, Cosmic: 1.6 }, rarityBoost: 1.09,
    environments: ['dry', 'drought', 'acid_rain'], description: 'Faceted sand sings in harmony whenever the dunes shift.',
  },
  aurora_tundra: {
    name: 'Aurora Tundra', emoji: '🌌', types: { Ice: 2.7, Cosmic: 1.7 }, rarityBoost: 1.11,
    environments: ['snow', 'dry'], description: 'Colored polar light flows close enough to brush with a wingtip.',
  },
  thundersteppe: {
    name: 'Thundersteppe', emoji: '⛈️', types: { Electric: 2.7, Ground: 1.6 }, rarityBoost: 1.07,
    environments: ['frequent_rain', 'dry', 'drought'], description: 'Charged grasslands rumble long before any storm arrives.',
  },
  emberwood: {
    name: 'Emberwood', emoji: '🔥', types: { Fire: 2.7, Grass: 1.65 }, rarityBoost: 1.08,
    environments: ['drought', 'humid', 'acid_rain'], description: 'Fireproof trees grow glowing leaves that never turn to ash.',
  },
  moonfen: {
    name: 'Moonfen', emoji: '🌙', types: { Cosmic: 2.5, Water: 1.8 }, rarityBoost: 1.12,
    environments: ['humid', 'frequent_rain', 'acid_rain'], description: 'Still marsh pools each hold a different reflection of the moon.',
  },
  sunpetal_savanna: {
    name: 'Sunpetal Savanna', emoji: '🌻', types: { Grass: 2.5, Fire: 1.7 }, rarityBoost: 1.04,
    environments: ['drought', 'humid', 'dry'], description: 'Golden flowers track travelers instead of following the sun.',
  },
  cloudreef: {
    name: 'Cloudreef', emoji: '🪽', types: { Air: 2.7, Water: 1.55 }, rarityBoost: 1.09,
    environments: ['dry', 'humid', 'frequent_rain'], description: 'Floating coral islands drift through rivers of mist.',
  },
  ironroot_caverns: {
    name: 'Ironroot Caverns', emoji: '⛏️', types: { Ground: 2.5, Grass: 1.75 }, rarityBoost: 1.06,
    environments: ['humid', 'dry', 'acid_rain'], description: 'Metallic roots hold up vaults filled with glowing mineral gardens.',
  },
  cometfall_crater: {
    name: 'Cometfall Crater', emoji: '☄️', types: { Cosmic: 2.8, Fire: 1.55 }, rarityBoost: 1.15,
    environments: ['dry', 'acid_rain', 'drought'], description: 'Warm fragments of an ancient comet still orbit the central hollow.',
  },
  frostfire_springs: {
    name: 'Frostfire Springs', emoji: '♨️', types: { Ice: 2.35, Fire: 2.05 }, rarityBoost: 1.1,
    environments: ['snow', 'humid', 'dry'], description: 'Blue flames and freezing water coil together without canceling out.',
  },
  charged_marsh: {
    name: 'Charged Marsh', emoji: '🔋', types: { Electric: 2.6, Water: 1.75 }, rarityBoost: 1.07,
    environments: ['frequent_rain', 'humid', 'acid_rain'], description: 'Every reed stores a spark and every puddle hums softly.',
  },
  windcarved_expanse: {
    name: 'Windcarved Expanse', emoji: '💨', types: { Air: 2.55, Ground: 1.8 }, rarityBoost: 1.04,
    environments: ['dry', 'drought'], description: 'Endless wind has sculpted the stone into sweeping feather shapes.',
  },
  prism_isles: {
    name: 'Prism Isles', emoji: '🌈', types: { Water: 2.15, Ice: 1.65, Cosmic: 1.45 }, rarityBoost: 1.13,
    environments: ['frequent_rain', 'humid', 'snow'], description: 'Rainbows harden into bridges between drifting crystalline islands.',
  },
  voidgarden: {
    name: 'Voidgarden', emoji: '🪐', types: { Cosmic: 3, Grass: 1.25 }, rarityBoost: 1.16,
    environments: ['dry', 'acid_rain'], description: 'Impossible flowers open in silence along the rim of open space.',
  },
});

export const ENVIRONMENTS = Object.freeze({
  drought: {
    name: 'Drought', emoji: '☀️', types: { Fire: 1.65, Ground: 1.5, Water: 0.55, Grass: 0.75 }, rarityBoost: 1.02,
    description: 'Months pass without meaningful precipitation.',
  },
  acid_rain: {
    name: 'Acid Rain', emoji: '☣️', types: { Cosmic: 1.55, Water: 1.25, Electric: 1.15, Grass: 0.7 }, rarityBoost: 1.12,
    description: 'Corrosive luminous rain favors unusually hardy Hathors.',
  },
  humid: {
    name: 'Humid', emoji: '💧', types: { Water: 1.45, Grass: 1.35, Fire: 0.8 }, rarityBoost: 1.02,
    description: 'Heavy moisture hangs in the air without constant rainfall.',
  },
  frequent_rain: {
    name: 'Frequent Rain', emoji: '🌧️', types: { Water: 1.85, Electric: 1.3, Fire: 0.65 }, rarityBoost: 1.06,
    description: 'Passing rain bands soak the region throughout the day.',
  },
  rainforest: {
    name: 'Rainforest', emoji: '🌴', types: { Grass: 1.9, Water: 1.5, Air: 1.15 }, rarityBoost: 1.08,
    description: 'Warm rainfall sustains dense, layered living growth.',
  },
  dry: {
    name: 'Dry', emoji: '🏜️', types: { Air: 1.65, Cosmic: 1.65, Water: 0.55, Ice: 0.75 }, rarityBoost: 1.06,
    description: 'Above the clouds or in space, precipitation is nearly impossible.',
  },
  snow: {
    name: 'Snow', emoji: '❄️', types: { Ice: 2, Water: 1.1, Fire: 0.6 }, rarityBoost: 1.08,
    description: 'Persistent snowfall blankets the biome in reflective frost.',
  },
});

export const WORLD_EVENT_DURATION_MS = 30 * 60 * 1000;
