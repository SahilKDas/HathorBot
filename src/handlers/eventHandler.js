import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadEvents(client, directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.js'));
  for (const file of files) {
    const event = (await import(pathToFileURL(path.join(directory, file)).href)).default;
    const listener = (...args) => Promise.resolve(event.execute(...args, client.app)).catch((error) => {
      console.error(`[events] ${event.name} failed:`, error);
    });
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
  }
}
