import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('profile').setDescription('View your Flamingo trainer profile'),
  aliases: ['bal', 'balance'],
  async execute(ctx, app) {
    const user = app.users.get(ctx.userId);
    const embed = new EmbedBuilder().setColor(0xff69b4).setTitle(`${ctx.user.username}’s Trainer Profile`)
      .addFields(
        { name: 'Progress', value: `Level **${user.level}** · ${user.xp} XP`, inline: true },
        { name: 'Wallet', value: `🦐 **${user.shrimpCoins}** Shrimp Coins`, inline: true },
        { name: 'Collection', value: `${user.inventory.length} Flamingos · ${user.eggs.length} Eggs`, inline: true },
        { name: 'Adventures', value: `${user.statistics.catches} catches · ${user.statistics.hatches} hatches`, inline: true },
        { name: 'Duels', value: `${user.statistics.duelWins} wins · ${user.statistics.duelLosses} losses`, inline: true },
      );
    return ctx.reply({ embeds: [embed] });
  },
};
