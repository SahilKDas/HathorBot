import { Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CommandContext } from '../structures/CommandContext.js';

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(target) : entry.name.endsWith('.js') ? [target] : [];
  }));
  return nested.flat();
}

export async function loadCommands(client, directory, app) {
  client.commands = new Collection();
  client.commandAliases = new Collection();
  for (const file of await javascriptFiles(directory)) {
    const command = (await import(pathToFileURL(file).href)).default;
    if (!command?.data?.name || typeof command.execute !== 'function') {
      console.warn(`[commands] Skipping invalid module ${file}`);
      continue;
    }
    client.commands.set(command.data.name, command);
    for (const alias of command.aliases ?? []) client.commandAliases.set(alias, command.data.name);
  }
  client.app = app;
  return client.commands;
}

export async function executeCommand(command, source, args = []) {
  try {
    await command.execute(new CommandContext(source, args), source.client.app);
  } catch (error) {
    console.error(`[commands] ${command.data.name} failed:`, error);
    const context = new CommandContext(source, args);
    await context.reply({ content: 'Something went wrong while running that command.', ephemeral: true }).catch(() => null);
  }
}

export async function executePrefix(message, prefix) {
  if (!message.content.startsWith(prefix) || message.author.bot) return false;
  const body = message.content.slice(prefix.length).trim();
  if (!body) return false;
  const parts = body.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const commandName = parts.shift()?.toLowerCase();
  const args = parts.map((part) => part.replace(/^(?:"|')|(?:"|')$/g, ''));
  const resolvedName = message.client.commandAliases.get(commandName) ?? commandName;
  const command = message.client.commands.get(resolvedName);
  if (!command) return false;
  await executeCommand(command, message, args);
  return true;
}
