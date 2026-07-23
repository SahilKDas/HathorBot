import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FLAMINGOS } from '../src/data/flamingos.js';
import { speciesSlug } from '../src/services/AssetService.js';

const apiKey = process.env.REMOVE_BG_API_KEY;
if (!apiKey || apiKey === 'your-remove-bg-api-key') {
  throw new Error('Set REMOVE_BG_API_KEY in .env before running this build-time command.');
}

const sourceDirectory = path.resolve('.tmp', 'imagegen', 'source', 'hathors');
const outputDirectory = path.resolve('assets', 'hathors');
await mkdir(outputDirectory, { recursive: true });

async function removeBackground(species) {
  const slug = speciesSlug(species.name);
  const inputPath = path.join(sourceDirectory, `${slug}.png`);
  const outputPath = path.join(outputDirectory, `${slug}.png`);
  const input = await readFile(inputPath);
  const form = new FormData();
  form.append('size', 'auto');
  form.append('format', 'png');
  form.append('image_file', new Blob([input], { type: 'image/png' }), `${slug}.png`);

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`${species.name}: remove.bg returned HTTP ${response.status}: ${details}`);
  }
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  console.log(`[assets] ${species.name} -> ${path.relative(process.cwd(), outputPath)}`);
}

// Keep API pressure modest while still processing the one-time build efficiently.
for (let index = 0; index < FLAMINGOS.length; index += 2) {
  await Promise.all(FLAMINGOS.slice(index, index + 2).map(removeBackground));
}
console.log(`[assets] Finished ${FLAMINGOS.length} transparent canonical species images.`);
