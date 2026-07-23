import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client, app) {
    console.log(`[discord] Ready as ${client.user.tag} in ${client.guilds.cache.size} guild(s).`);
    client.user.setActivity('for wild Flamingos');
    const commands = client.commands.map((command) => command.data.toJSON());
    const guildIds = app.config.guildId
      ? [app.config.guildId]
      : [...(await client.guilds.fetch()).keys()];
    for (const guildId of guildIds) {
      await client.application.commands.set(commands, guildId);
      console.log(`[discord] Registered ${commands.length} slash commands in guild ${guildId}.`);
    }
  },
};
