import { randomInt } from 'node:crypto';

export const int = (min, max) => randomInt(min, max + 1);
export const chance = (numerator, denominator) => randomInt(denominator) < numerator;
export const pick = (items) => items[randomInt(items.length)];

export function weightedPick(entries, getWeight = (entry) => entry.weight) {
  const total = entries.reduce((sum, entry) => sum + getWeight(entry), 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= getWeight(entry);
    if (roll < 0) return entry;
  }
  return entries.at(-1);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
