export const TYPE_ADVANTAGES = Object.freeze({
  Water: ['Fire', 'Ground'],
  Fire: ['Grass', 'Ice'],
  Ground: ['Electric', 'Fire'],
  Grass: ['Water', 'Ground'],
  Cosmic: ['Air', 'Ice'],
  Air: ['Grass', 'Ground'],
  Ice: ['Air', 'Grass'],
  Electric: ['Water', 'Air'],
});

const elementalMoves = {
  Water: { name: 'Tidal Lance', power: 64, accuracy: 90, cooldown: 1 },
  Fire: { name: 'Solar Flare', power: 68, accuracy: 88, cooldown: 1 },
  Ground: { name: 'Fault Stomp', power: 66, accuracy: 90, cooldown: 1 },
  Grass: { name: 'Briar Waltz', power: 62, accuracy: 93, cooldown: 1 },
  Cosmic: { name: 'Nova Spiral', power: 70, accuracy: 87, cooldown: 1 },
  Air: { name: 'Gale Scythe', power: 62, accuracy: 94, cooldown: 1 },
  Ice: { name: 'Prism Hail', power: 65, accuracy: 90, cooldown: 1 },
  Electric: { name: 'Crown Bolt', power: 67, accuracy: 89, cooldown: 1 },
};

const statusMoves = {
  Water: { name: 'Undertow', status: 'soaked', accuracy: 88, cooldown: 2 },
  Fire: { name: 'Cinder Hex', status: 'burned', accuracy: 85, cooldown: 2 },
  Ground: { name: 'Seismic Dread', status: 'shaken', accuracy: 88, cooldown: 2 },
  Grass: { name: 'Root Snare', status: 'rooted', accuracy: 88, cooldown: 2 },
  Cosmic: { name: 'Star Daze', status: 'dazed', accuracy: 86, cooldown: 2 },
  Air: { name: 'Crosswind', status: 'windswept', accuracy: 90, cooldown: 2 },
  Ice: { name: 'Flash Freeze', status: 'frozen', accuracy: 82, cooldown: 3 },
  Electric: { name: 'Static Lock', status: 'paralyzed', accuracy: 84, cooldown: 3 },
};

export const STATUS_EFFECTS = Object.freeze({
  soaked: { name: 'Soaked', duration: 3, description: 'takes 20% more Electric damage' },
  burned: { name: 'Burned', duration: 3, description: 'loses 5% HP after acting and deals 15% less damage' },
  shaken: { name: 'Shaken', duration: 3, description: 'has 15% lower Defense' },
  rooted: { name: 'Rooted', duration: 3, description: 'has 30% lower Speed and cannot switch' },
  dazed: { name: 'Dazed', duration: 3, description: 'has 15% lower accuracy' },
  windswept: { name: 'Windswept', duration: 3, description: 'takes 15% more damage' },
  frozen: { name: 'Frozen', duration: 2, description: 'has a 30% chance to lose its action' },
  paralyzed: { name: 'Paralyzed', duration: 3, description: 'has a 25% chance to lose its action' },
});

export function movesForType(type) {
  return [
    { id: 'peck', name: 'Precision Peck', type: 'Neutral', power: 42, accuracy: 100, cooldown: 0 },
    { id: 'elemental', type, ...elementalMoves[type] },
    { id: 'status', type, power: 0, ...statusMoves[type] },
    { id: 'guard', name: 'Plume Guard', type: 'Neutral', power: 0, accuracy: 100, cooldown: 2, guard: true },
  ];
}

export function typeEffectiveness(attackingType, defendingType) {
  if (attackingType === 'Neutral') return 1;
  if (TYPE_ADVANTAGES[attackingType]?.includes(defendingType)) return 1.5;
  if (TYPE_ADVANTAGES[defendingType]?.includes(attackingType)) return 0.67;
  return 1;
}
