export function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function makeHint(name) {
  const visible = name.split('').map((character, index) => {
    if (character === ' ') return ' ';
    return index === 0 || index === name.length - 1 || index % 3 === 0 ? character : '\\_';
  });
  return visible.join(' ');
}

export function progressBar(value, maximum, size = 10) {
  const ratio = maximum <= 0 ? 1 : Math.min(1, value / maximum);
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

export function duration(ms) {
  if (ms <= 0) return 'ready';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
