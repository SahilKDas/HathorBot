import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FLAMINGOS } from '../src/data/flamingos.js';
import { speciesSlug } from '../src/services/AssetService.js';

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(target) : entry.name.endsWith('.js') ? [target] : [];
  }));
  return nested.flat();
}

const files = [
  ...(await javascriptFiles(path.resolve('src'))),
  ...(await javascriptFiles(path.resolve('scripts'))),
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const missingAssets = FLAMINGOS
  .map((species) => path.resolve('assets', 'hathors', `${speciesSlug(species.name)}.png`))
  .filter((file) => !existsSync(file));
if (!existsSync(path.resolve('assets', 'daycare', 'background.png'))) {
  missingAssets.push(path.resolve('assets', 'daycare', 'background.png'));
}
if (missingAssets.length) {
  console.error(`Build failed: ${missingAssets.length} required static asset(s) are missing:`);
  for (const file of missingAssets) console.error(`- ${path.relative(process.cwd(), file)}`);
  process.exit(1);
}

console.log(`[build] Validated ${files.length} JavaScript files and ${FLAMINGOS.length + 1} static game assets.`);
