import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('spawn-now').setDescription('Immediately create a wild Flamingo (admin testing)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(ctx, app) {
    if (!ctx.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) return ctx.reply({ content: 'You need Manage Server to use this.', ephemeral: true });
    await ctx.defer(true);
    const spawn = await app.spawns.spawn(ctx.channel);
    return ctx.reply(spawn ? 'Spawned a wild Flamingo.' : 'A wild Flamingo is already active here.');
  },
};
