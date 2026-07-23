import { Events } from 'discord.js';
import { executeCommand } from '../handlers/commandHandler.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    await executeCommand(command, interaction);
  },
};
