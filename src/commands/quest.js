import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { progressBar } from '../utils/text.js';

export default {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('View or claim your daily quest')
    .addStringOption((option) => option.setName('action').setDescription('What to do').addChoices(
      { name: 'View', value: 'view' }, { name: 'Claim reward', value: 'claim' },
    )),
  aliases: ['daily'],
  async execute(ctx, app) {
    const action = (ctx.string('action', 0) ?? 'view').toLowerCase();
    await app.quests.get(ctx.userId);
    if (action === 'claim') {
      const result = await app.quests.claim(ctx.userId);
      if (!result.ok) return ctx.reply({ content: result.reason, ephemeral: true });
      return ctx.reply(`🎁 Quest claimed: **${result.quest.rewardCoins} Shrimp Coins**, **${result.quest.rewardXp} Trainer XP**, **${result.creatureXp} team XP**, one **Shrimp Treat**, and one **Quest Sigil**!`);
    }
    const user = app.users.get(ctx.userId);
    const quest = user.dailyQuest;
    const embed = new EmbedBuilder().setColor(0xff69b4).setTitle('Today’s Hathor Quest')
      .setDescription(`**${quest.description}**\n${progressBar(quest.progress, quest.target, 12)} ${quest.progress}/${quest.target}`)
      .addFields(
        { name: 'Reward', value: `🦐 ${quest.rewardCoins} Shrimp Coins · ✨ ${quest.rewardXp} Trainer XP · 125 team XP` },
        { name: 'Quest unlocks', value: `1 Shrimp Treat · 1 Quest Sigil\nCurrent Sigils: **${user.ascensionSigils}** (3 unlock an Ascension)` },
      )
      .setFooter({ text: quest.claimed ? 'Reward claimed' : quest.progress >= quest.target ? 'Ready to claim!' : 'Resets daily at 00:00 UTC' });
    return ctx.reply({ embeds: [embed] });
  },
};
