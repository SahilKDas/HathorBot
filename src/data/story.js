export const STORY_SCORE_NAMES = Object.freeze([
  'mercy', 'ambition', 'frogLoyalty', 'hathorLoyalty', 'order', 'chaos', 'knowledge', 'greed',
]);

export const CROWN_OUTCOMES = Object.freeze({
  fallen: {
    name: 'Crown Fallen', short: 'After Croakfall',
    description: 'The Crown of Chorus no longer commands the world, and Gloamgut\'s empire has been broken.',
  },
  reformed: {
    name: 'Crown Reformed', short: 'The New Chorus',
    description: 'The Crown has become a pact between frogs and Hathors rather than an instrument of control.',
  },
  ascendant: {
    name: 'Crown Ascendant', short: 'Under the Lily Crown',
    description: 'Croakspire stands victorious, and the frog empire now shapes the fate of every biome.',
  },
});

export const WORLD_STATES = Object.freeze({
  united: {
    name: 'United World', realm: 'the Joined Biomes',
    description: 'The twenty-four biomes cooperate through a shared migration council.',
  },
  divided: {
    name: 'Divided World', realm: 'Twenty-Four Kingdoms',
    description: 'Each biome protects its own borders, bargains, and version of the truth.',
  },
  untamed: {
    name: 'Untamed World', realm: 'the Wild Horizon',
    description: 'Central rule collapses, leaving guardians, wild Hathors, and strange local rulers in control.',
  },
});

export const PLAYER_LEGACIES = Object.freeze({
  guardian: { name: 'The Guardian', ending: 'The Last Guardian', description: 'You are remembered for placing vulnerable lives before power.' },
  liberator: { name: 'The Liberator', ending: 'The Chainbreaker', description: 'No crown, cage, or conqueror survives long in your shadow.' },
  diplomat: { name: 'The Diplomat', ending: 'The Many-Voiced Envoy', description: 'Enemies keep discovering that speaking with you is safer than fighting you.' },
  bog_monarch: { name: 'The Bog Monarch', ending: 'The Pink Tyrant', description: 'You master the machinery of rule and make the world answer to your ambition.' },
  trickster: { name: 'The Trickster', ending: 'The Lilygate Trickster', description: 'History cannot decide whether your impossible schemes were genius or luck.' },
  scholar: { name: 'The Scholar', ending: 'The Keeper of Croaking Truths', description: 'You preserve the dangerous knowledge hidden beneath the invasion.' },
  beastfriend: { name: 'The Beastfriend', ending: 'The Friend of Fang and Feather', description: 'Guardians, tadpoles, and wild Hathors recognize you as one of their own.' },
  mercenary: { name: 'The Mercenary', ending: 'The Shrimp-Coin Sovereign', description: 'You emerge with contracts in every biome and a fortune nobody can ignore.' },
  prophet: { name: 'The Prophet', ending: 'The Voice Beyond Thirst', description: 'You understand the warning that both the frogs and Hathors nearly missed.' },
  wanderer: { name: 'The Wanderer', ending: 'The Walker Between Lilygates', description: 'No throne keeps you; every road and every biome becomes your home.' },
  catastrophe: { name: 'The Magnificent Catastrophe', ending: 'The Magnificent Catastrophe', description: 'The world survives your decisions, though scholars remain unsure how.' },
});

const ENDING_OVERRIDES = Object.freeze({
  'fallen:united:guardian': 'The Dawn After Croakfall',
  'reformed:united:diplomat': 'The Republic of Lily and Feather',
  'ascendant:united:bog_monarch': 'All Hail the Pink Tyrant',
  'fallen:divided:wanderer': 'Twenty-Four Little Kingdoms',
  'ascendant:untamed:catastrophe': 'Wibble, Devourer of Destiny',
  'reformed:untamed:prophet': 'The Enemy Was Thirst',
  'fallen:divided:mercenary': 'A Profitable Apocalypse',
});

export const ENDING_CATALOG = Object.freeze(Object.entries(CROWN_OUTCOMES).flatMap(([crownId, crown]) =>
  Object.entries(WORLD_STATES).flatMap(([worldId, world]) =>
    Object.entries(PLAYER_LEGACIES).map(([legacyId, legacy]) => {
      const id = `${crownId}:${worldId}:${legacyId}`;
      return Object.freeze({
        id,
        crownId,
        worldId,
        legacyId,
        title: ENDING_OVERRIDES[id] ?? `${legacy.ending} of ${world.realm}: ${crown.short}`,
        description: `${crown.description} ${world.description} ${legacy.description}`,
      });
    }))));

export function endingById(id) {
  return ENDING_CATALOG.find((ending) => ending.id === id) ?? null;
}

const c = (id, label, consequence, configuration) => Object.freeze({ id, label, consequence, ...configuration });

export const STORY_CHAPTERS = Object.freeze([
  {
    id: 'first_lilygate', title: 'The First Lilygate', biomes: ['skyreach', 'great_bloom'], explorations: 3,
    briefing: 'A glowing Lilygate tears open above Skyreach Cliffs while frog troops drag trapped Hathors toward it.',
    encounters: [
      'Pip maps a wind tunnel while armored frogs bounce helplessly between the cliffs.',
      'A frightened Cloudstep leads you to a Chorus Lily broadcasting Gloamgut\'s invasion speech.',
      'You reach the Lilygate control stone as three enormous tadpoles emerge from the clouds.',
    ],
    choices: [
      c('a', 'Rescue the trapped Hathors', 'The captives escape and Skyreach raises the first banner of resistance.', { scores: { mercy: 3, hathorLoyalty: 3, order: 1 }, legacy: { guardian: 3, liberator: 1 }, crown: { fallen: 2 }, world: { united: 1 }, biomeState: 'liberated' }),
      c('b', 'Capture the frog soldiers', 'The prisoners reveal how the Crown of Chorus directs every invasion force.', { scores: { ambition: 2, knowledge: 2, order: 2 }, legacy: { scholar: 2, bog_monarch: 1 }, crown: { fallen: 1, ascendant: 1 }, world: { divided: 1 }, biomeState: 'player_controlled' }),
      c('c', 'Press the glowing frog button', 'The Lilygate turns sideways, rains pond water upward, and somehow closes.', { scores: { chaos: 4, knowledge: 1 }, legacy: { catastrophe: 3, trickster: 2 }, crown: { reformed: 1 }, world: { untamed: 3 }, biomeState: 'wibble_governed' }),
    ],
  },
  {
    id: 'wibble_surrenders', title: 'The Surrender of Sergeant Wibble', biomes: ['roseglass_lagoon', 'cinderheart_caldera'], explorations: 3,
    briefing: 'Sergeant Wibble waves a white lily and offers information, snacks, and several contradictory maps of Croakspire.',
    encounters: [
      'Wibble guides you through Roseglass shallows while pretending every wrong turn was tactical.',
      'Marshal Mudjaw\'s scouts corner the party beside a river of Cinderheart magma.',
      'A captured frog courier carries orders signed with Gloamgut\'s personal golden footprint.',
    ],
    choices: [
      c('a', 'Trust Wibble', 'Wibble joins the expedition and immediately loses the secret map in his hat.', { scores: { mercy: 2, frogLoyalty: 3, chaos: 1 }, legacy: { diplomat: 2, beastfriend: 2 }, crown: { reformed: 2 }, world: { united: 1 }, biomeState: 'shared', companions: ['Sergeant Wibble'] }),
      c('b', 'Interrogate Wibble', 'Under rigorous questioning, Wibble reveals everything—including several facts nobody asked for.', { scores: { ambition: 2, knowledge: 3, order: 1 }, legacy: { scholar: 3, liberator: 1 }, crown: { fallen: 1 }, world: { divided: 1 }, biomeState: 'liberated' }),
      c('c', 'Appoint Wibble tactical advisor', 'Wibble accepts, invents the sideways charge, and accidentally wins a battle with it.', { scores: { chaos: 4, frogLoyalty: 1 }, legacy: { catastrophe: 3, trickster: 2 }, crown: { ascendant: 1 }, world: { untamed: 2 }, biomeState: 'wibble_governed', companions: ['Sergeant Wibble'] }),
    ],
  },
  {
    id: 'singing_bloom', title: 'The Singing Bloom', biomes: ['sunscorch_badlands', 'emerald_crown'], explorations: 3,
    briefing: 'A colossal Chorus Lily infects Great Bloom, and its song is spreading through the roots beneath neighboring biomes.',
    encounters: [
      'Choirmaster Plop challenges your team to a musical duel in the Emerald Crown.',
      'The infected roots animate stone arches across Sunscorch Badlands.',
      'Professor Maybe produces a tuning fork labeled MOSTLY SAFE.',
    ],
    choices: [
      c('a', 'Cure the Chorus Lily', 'The flower survives without the controlling song and becomes a sanctuary for displaced Hathors.', { scores: { mercy: 3, hathorLoyalty: 2, knowledge: 1 }, legacy: { guardian: 2, beastfriend: 2 }, crown: { fallen: 1, reformed: 1 }, world: { united: 2 }, biomeState: 'shared' }),
      c('b', 'Weaponize its song', 'You keep a private command melody capable of turning frog troops against their officers.', { scores: { ambition: 3, greed: 2, knowledge: 2 }, legacy: { bog_monarch: 3, mercenary: 1 }, crown: { ascendant: 2 }, world: { divided: 2 }, biomeState: 'player_controlled' }),
      c('c', 'Teach it a different song', 'The Lily begins singing an unbearable marching tune; both armies retreat from the region.', { scores: { chaos: 3, mercy: 1 }, legacy: { trickster: 3, catastrophe: 1 }, crown: { reformed: 1 }, world: { untamed: 2 }, biomeState: 'abandoned' }),
    ],
  },
  {
    id: 'tadwick_asylum', title: 'The Runaway Prince', biomes: ['starwatch_plateau', 'mirrorfall_glacier'], explorations: 3,
    briefing: 'Prince Tadwick escapes Croakspire carrying half of the Crown\'s star-map and begs for asylum.',
    encounters: [
      'Tadwick deciphers a constellation visible at midday from Starwatch Plateau.',
      'Frog bounty hunters pursue the party through Mirrorfall\'s reflected corridors.',
      'Puddle-Eye warns that the missing half of the map points beyond the world.',
    ],
    choices: [
      c('a', 'Protect Tadwick', 'Tadwick publicly rejects his father and becomes a voice for peaceful frogs.', { scores: { mercy: 3, frogLoyalty: 2, order: 1 }, legacy: { guardian: 2, diplomat: 3 }, crown: { reformed: 3 }, world: { united: 2 }, biomeState: 'shared', companions: ['Prince Tadwick'] }),
      c('b', 'Return him for a reward', 'Gloamgut pays generously and grants your party temporary passage through frog territory.', { scores: { greed: 4, frogLoyalty: 2, ambition: 2 }, legacy: { mercenary: 4, bog_monarch: 1 }, crown: { ascendant: 2 }, world: { divided: 2 }, biomeState: 'occupied' }),
      c('c', 'Disguise him as a flamingo', 'The disguise fools absolutely nobody except Marshal Mudjaw, who salutes “Private Longlegs.”', { scores: { chaos: 3, mercy: 2, frogLoyalty: 1 }, legacy: { trickster: 4, catastrophe: 1 }, crown: { reformed: 1 }, world: { untamed: 1 }, biomeState: 'wibble_governed', companions: ['Prince Tadwick'] }),
    ],
  },
  {
    id: 'ribbitra_laboratory', title: 'The Tadpole Laboratory', biomes: ['tempest_shore', 'whispering_mangroves', 'crystal_dunes'], explorations: 3,
    briefing: 'Dame Ribbitra is breeding Acid Rain tadpoles beneath Whispering Mangroves.',
    encounters: [
      'Static-charged tadpoles chase the party along Tempest Shore.',
      'Hollow mangrove roots repeat Ribbitra\'s laboratory passwords.',
      'Crystal Dunes amplify one tiny tadpole croak into a continent-wide alarm.',
    ],
    choices: [
      c('a', 'Evacuate the tadpoles', 'The rescued tadpoles reject Ribbitra and settle under the protection of a biome guardian.', { scores: { mercy: 4, frogLoyalty: 2, hathorLoyalty: 1 }, legacy: { beastfriend: 4, guardian: 2 }, crown: { reformed: 2 }, world: { united: 2 }, biomeState: 'guardian_ruled', companions: ['Puddle-Eye'] }),
      c('b', 'Seize the laboratory', 'The equipment becomes yours, along with formulas worth an alarming number of Shrimp Coins.', { scores: { ambition: 3, greed: 3, knowledge: 2 }, legacy: { scholar: 2, mercenary: 3, bog_monarch: 1 }, crown: { ascendant: 2 }, world: { divided: 2 }, biomeState: 'player_controlled' }),
      c('c', 'Release every experiment', 'The region becomes a bouncing ecological disaster that is, against reason, mostly friendly.', { scores: { chaos: 5, mercy: 1 }, legacy: { catastrophe: 4, beastfriend: 1 }, crown: { fallen: 1 }, world: { untamed: 4 }, biomeState: 'untamed' }),
    ],
  },
  {
    id: 'guardian_mayor', title: 'The Guardian Election', biomes: ['aurora_tundra', 'thundersteppe'], explorations: 3,
    briefing: 'The invasion awakens a colossal biome guardian whose first demand is to know who authorized all these armies.',
    encounters: [
      'The guardian tests your intentions beneath Aurora Tundra\'s flowing lights.',
      'Marshal Mudjaw challenges the guardian on the electrified Thundersteppe.',
      'A settlement asks you to decide whether any creature should hold this much power.',
    ],
    choices: [
      c('a', 'Befriend the guardian', 'It joins the resistance voluntarily and opens safe migration corridors.', { scores: { mercy: 3, hathorLoyalty: 3 }, legacy: { beastfriend: 4, guardian: 2 }, crown: { fallen: 2 }, world: { united: 2 }, biomeState: 'guardian_ruled' }),
      c('b', 'Bind it to your cause', 'The guardian obeys, but every settlement now knows you are willing to use a magical leash.', { scores: { ambition: 4, order: 3, greed: 1 }, legacy: { bog_monarch: 4, mercenary: 1 }, crown: { ascendant: 3 }, world: { divided: 1 }, biomeState: 'player_controlled' }),
      c('c', 'Convince it that it is mayor', 'Mayor Guardian outlaws invasions, taxes thunder, and schedules migration every second Tuesday.', { scores: { chaos: 3, order: 1, mercy: 1 }, legacy: { trickster: 2, catastrophe: 3 }, crown: { reformed: 1 }, world: { untamed: 3 }, biomeState: 'guardian_ruled' }),
    ],
  },
  {
    id: 'weather_engine', title: 'The Stolen Weather Engine', biomes: ['emberwood', 'moonfen', 'sunpetal_savanna'], explorations: 3,
    briefing: 'You capture a weather engine capable of forcing any of the seven rain environments into any biome.',
    encounters: [
      'Blue rain falls upward through Emberwood while its fireproof leaves begin freezing.',
      'Moonfen reflects a future in which the engine never stops.',
      'Sunpetal flowers point toward a hidden control bunker instead of the sun.',
    ],
    choices: [
      c('a', 'Destroy the engine', 'The machine collapses, returning the region to natural weather at the cost of its secrets.', { scores: { hathorLoyalty: 3, mercy: 2 }, legacy: { liberator: 4, guardian: 1 }, crown: { fallen: 3 }, world: { united: 1 }, biomeState: 'liberated' }),
      c('b', 'Control the engine', 'You gain command of the weather and every faction begins negotiating with you very politely.', { scores: { ambition: 4, greed: 3, knowledge: 2 }, legacy: { bog_monarch: 3, mercenary: 3 }, crown: { ascendant: 3 }, world: { divided: 2 }, biomeState: 'player_controlled' }),
      c('c', 'Reconnect the cables randomly', 'The engine becomes self-aware, declares itself Weather, and wanders away to find purpose.', { scores: { chaos: 5, knowledge: 1 }, legacy: { catastrophe: 4, trickster: 2 }, crown: { reformed: 1 }, world: { untamed: 4 }, biomeState: 'untamed' }),
    ],
  },
  {
    id: 'feather_war', title: 'The Feather War', biomes: ['cloudreef', 'ironroot_caverns'], explorations: 3,
    briefing: 'Frog defectors, Hathor wardens, merchants, and guardians turn on one another over the recovered beacons.',
    encounters: [
      'Floating Cloudreef islands carry rival delegations that refuse to land together.',
      'Ironroot Caverns hide enough weapons to let any one faction win the war.',
      'Sergeant Wibble misplaces every battle plan, briefly creating an opportunity for peace.',
    ],
    choices: [
      c('a', 'Unite the factions', 'The delegates sign the Accord of Lily and Feather and prepare to face Croakspire together.', { scores: { mercy: 3, order: 3, frogLoyalty: 2, hathorLoyalty: 2 }, legacy: { diplomat: 5, guardian: 1 }, crown: { reformed: 3 }, world: { united: 5 }, biomeState: 'shared' }),
      c('b', 'Choose a ruler', 'A single authority ends the war quickly, though not everyone accepts the new order.', { scores: { ambition: 4, order: 4 }, legacy: { bog_monarch: 4, mercenary: 1 }, crown: { ascendant: 3 }, world: { divided: 2 }, biomeState: 'player_controlled' }),
      c('c', 'Sabotage everyone', 'Every army arrives at the wrong battlefield and the exhausted factions simply go home.', { scores: { chaos: 5, greed: 1 }, legacy: { trickster: 4, catastrophe: 2 }, crown: { fallen: 1 }, world: { untamed: 4 }, biomeState: 'abandoned' }),
    ],
  },
  {
    id: 'siege_croakspire', title: 'The Siege of Croakspire', biomes: ['cometfall_crater', 'frostfire_springs', 'charged_marsh'], explorations: 3,
    briefing: 'Croakspire marches toward Voidgarden while Gloamgut\'s generals assemble for the final defense.',
    encounters: [
      'Cometfall fragments provide a path onto the fortress\'s moving upper towers.',
      'Frostfire Springs conceal Prince Tadwick\'s forgotten entrance tunnel.',
      'Charged Marsh powers the Crown\'s last defensive Chorus Lily.',
    ],
    choices: [
      c('a', 'Lead a direct assault', 'Your team breaks Mudjaw\'s army in open battle and enters Croakspire as liberators.', { scores: { hathorLoyalty: 3, order: 2, ambition: 1 }, legacy: { liberator: 5, guardian: 1 }, crown: { fallen: 4 }, world: { united: 2 }, biomeState: 'liberated' }),
      c('b', 'Infiltrate the fortress', 'You expose Gloamgut\'s secret map and open the gates without destroying the city within.', { scores: { knowledge: 4, mercy: 2, ambition: 1 }, legacy: { scholar: 4, diplomat: 1, trickster: 1 }, crown: { reformed: 2, fallen: 1 }, world: { divided: 1 }, biomeState: 'shared' }),
      c('c', 'Enter as traveling entertainers', 'Choirmaster Plop books the performance. Your finale disables the Crown amplifier.', { scores: { chaos: 4, frogLoyalty: 1 }, legacy: { trickster: 5, catastrophe: 2 }, crown: { reformed: 1 }, world: { untamed: 3 }, biomeState: 'wibble_governed' }),
    ],
  },
  {
    id: 'crown_of_chorus', title: 'Gloamgut and the Crown', biomes: ['windcarved_expanse', 'prism_isles', 'voidgarden'], explorations: 3,
    briefing: 'At the summit of Croakspire, Gloamgut reveals The Thirst Beyond approaching Voidgarden and offers you the Crown.',
    encounters: [
      'Puddle-Eye reveals the ancient migration route was itself a form of control.',
      'The Thirst Beyond opens one star-sized eye over Prism Isles.',
      'Gloamgut\'s final croak shakes every Lilygate and calls you to the throne room.',
    ],
    choices: [
      c('a', 'Banish Gloamgut and break the Crown', 'The last controlling croak ends, leaving the world to face The Thirst Beyond freely.', { scores: { hathorLoyalty: 4, mercy: 1 }, legacy: { liberator: 5, guardian: 2 }, crown: { fallen: 8 }, world: { united: 1 }, biomeState: 'liberated' }),
      c('b', 'Redeem Gloamgut and rewrite the Chorus', 'Gloamgut surrenders command and the Crown becomes a voluntary warning network.', { scores: { mercy: 6, frogLoyalty: 4, knowledge: 2 }, legacy: { diplomat: 6, prophet: 2 }, crown: { reformed: 8 }, world: { united: 3 }, biomeState: 'shared' }),
      c('c', 'Serve the Croaking Crown', 'You become Gloamgut\'s champion and force every biome into the defensive flood plan.', { scores: { frogLoyalty: 6, order: 4, ambition: 3 }, legacy: { bog_monarch: 5, mercenary: 1 }, crown: { ascendant: 8 }, world: { united: 1, divided: 2 }, biomeState: 'occupied' }),
      c('d', 'Overthrow Gloamgut and take the Crown', 'Croakspire kneels to its new ruler as your voice rolls across all twenty-four biomes.', { scores: { ambition: 7, greed: 4, order: 3 }, legacy: { bog_monarch: 7, mercenary: 2 }, crown: { ascendant: 9 }, world: { divided: 2 }, biomeState: 'player_controlled' }),
      c('e', 'Let Wibble touch the Crown', 'Wibble absorbs the Chorus, declares lunch mandatory, and accidentally challenges the cosmos.', { scores: { chaos: 10, frogLoyalty: 2 }, legacy: { catastrophe: 10, trickster: 2 }, crown: { ascendant: 7 }, world: { untamed: 8 }, biomeState: 'wibble_governed', companions: ['Cosmic Sergeant Wibble'] }),
    ],
  },
]);

export const STORY_MILESTONES = Object.freeze([
  { percent: 10, coins: 1_000, label: 'Frog Resistance badge and Sergeant Wibble companion' },
  { percent: 25, coins: 2_500, label: 'Lilygate fast travel and faction equipment' },
  { percent: 50, coins: 5_000, label: 'one Gigantamax Catalyst' },
  { percent: 75, coins: 8_000, label: 'second Daycare pair slot and Croakspire access' },
  { percent: 90, coins: 0, label: 'route-dependent Legendary Hathor encounter' },
  { percent: 100, coins: 15_000, label: 'route-themed Gigantamax Hathor and the Hall of Ninety-Nine Doors' },
  { percent: 105, coins: 0, label: 'high-IV Mythic Story Egg' },
  { percent: 110, coins: 0, label: 'second Gigantamax Catalyst and Worldwalker aura' },
]);

export const STORY_ECHOES = Object.freeze([
  { title: 'Echo of the Broken Crown', text: 'You confront a timeline where the Crown shattered before the invasion began.' },
  { title: 'Echo of the Peaceful Bog', text: 'You defend a fragile republic formed by Gloamgut and his oldest enemies.' },
  { title: 'Echo of the Perfect Flood', text: 'You cross a world where every biome obeyed Croakspire and survived at a terrible price.' },
  { title: 'Echo of Ninety-Nine Doors', text: 'Alternate versions of your companions argue over which of you made the correct choices.' },
  { title: 'The Thirst Beyond', text: 'Your companions unite across fractured timelines for the secret final battle.' },
]);

export const BIOME_STORY_STATE_NAMES = Object.freeze({
  invaded: 'Invaded through a Lilygate',
  liberated: 'Liberated by Hathors',
  occupied: 'Occupied by frogs',
  shared: 'Shared peacefully',
  abandoned: 'Abandoned after the conflict',
  player_controlled: 'Controlled by the player',
  guardian_ruled: 'Ruled by a biome guardian',
  wibble_governed: 'Governed by Sergeant Wibble',
  untamed: 'Returned to untamed nature',
});
