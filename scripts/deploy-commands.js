import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId) throw new Error('DISCORD_TOKEN and CLIENT_ID are required in .env');

const commandsDirectory = path.resolve('src', 'commands');
const files = (await readdir(commandsDirectory)).filter((file) => file.endsWith('.js'));
const commands = [];
for (const file of files) {
  const command = (await import(pathToFileURL(path.join(commandsDirectory, file)).href)).default;
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);
const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);
await rest.put(route, { body: commands });
console.log(`[deploy] Registered ${commands.length} ${guildId ? 'guild' : 'global'} slash commands.`);
