import { Events } from 'discord.js';
import { executePrefix } from '../handlers/commandHandler.js';

export default {
  name: Events.MessageCreate,
  async execute(message, app) {
    if (message.author.bot || !message.guild) return;
    const wasCommand = await executePrefix(message, app.config.prefix);
    await app.breeding.noteMessage(message.author.id);
    if (!wasCommand) await app.spawns.noteMessage(message);
  },
};
