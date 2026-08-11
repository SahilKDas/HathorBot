import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('profile').setDescription('View your Hathor trainer profile'),
  aliases: ['bal', 'balance'],
  async execute(ctx, app) {
    const user = app.users.get(ctx.userId);
    const story = app.stories?.get(ctx.userId);
    const itemCount = Object.values(user.items).reduce((sum, count) => sum + count, 0);
    const embed = new EmbedBuilder().setColor(0xff69b4).setTitle(`${ctx.user.username}'s Trainer Profile`)
      .addFields(
        { name: 'Progress', value: `Level **${user.level}** / ${user.xp} Trainer XP`, inline: true },
        { name: 'Wallet', value: `**${user.shrimpCoins}** Shrimp Coins`, inline: true },
        { name: 'Quest Sigils', value: `**${user.ascensionSigils}**`, inline: true },
        { name: 'Gigantamax Catalysts', value: `**${user.gigantamaxCatalysts}**`, inline: true },
        { name: 'Collection', value: `${user.inventory.length} Hathors / ${user.eggs.length} Eggs`, inline: true },
        { name: 'Battle team', value: `${user.team.length}/6 selected`, inline: true },
        { name: 'Items', value: `${itemCount} owned`, inline: true },
        { name: 'Daycare', value: `${user.daycareSlots} pair slot${user.daycareSlots === 1 ? '' : 's'}`, inline: true },
        { name: 'Croaking Crown', value: story?.status === 'not_started' ? 'Not started' : `**${story?.completion ?? 0}% / 110%** / ${story?.discoveredEndings?.length ?? 0}/99 endings`, inline: true },
        { name: 'Adventures', value: `${user.statistics.catches} catches / ${user.statistics.hatches} hatches`, inline: true },
        { name: 'Battles', value: `${user.statistics.duelWins} wins / ${user.statistics.duelLosses} losses`, inline: true },
      );
    return ctx.reply({ embeds: [embed] });
  },
};
