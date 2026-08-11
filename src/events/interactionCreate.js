import { Events } from 'discord.js';
import { executeCommand } from '../handlers/commandHandler.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
      const app = interaction.client.app;
      if (interaction.customId.startsWith('battle:')) await app.battles.handleButton(interaction);
      else if (interaction.customId.startsWith('trade:')) await app.trades.handleButton(interaction);
      else if (interaction.customId.startsWith('market:')) await app.market.handleButton(interaction);
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    await executeCommand(command, interaction);
  },
};
