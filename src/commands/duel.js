import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('duel').setDescription('Duel another trainer using each flock’s strongest Flamingo')
    .addUserOption((option) => option.setName('opponent').setDescription('Trainer to duel').setRequired(true)),
  async execute(ctx, app) {
    const opponent = ctx.selectedUser('opponent', 0);
    if (!opponent) return ctx.reply(`Usage: ${app.config.prefix}duel @opponent`);
    if (opponent.bot) return ctx.reply({ content: 'Bots do not keep Flamingo flocks.', ephemeral: true });
    const result = await app.duels.duel(ctx.userId, opponent.id);
    if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
    const winner = result.winnerId === ctx.userId ? ctx.user : opponent;
    const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('⚔️ Flamingo Duel')
      .setDescription(`**${result.first.species}** faced **${result.second.species}** in a dazzling battle.\n\n🏆 <@${winner.id}> wins **50 Shrimp Coins**!`)
      .addFields(
        { name: ctx.user.username, value: `${result.first.species} · Power ${Math.round(result.firstPower)}`, inline: true },
        { name: opponent.username, value: `${result.second.species} · Power ${Math.round(result.secondPower)}`, inline: true },
      );
    return ctx.reply({ embeds: [embed] });
  },
};
