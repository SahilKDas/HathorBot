import { addXp } from '../models/User.js';
import { pick } from '../utils/random.js';

const QUESTS = [
  { kind: 'catch', target: 5, description: 'Catch 5 wild Flamingos', rewardCoins: 300, rewardXp: 120 },
  { kind: 'catch_type', type: 'Fire', target: 3, description: 'Catch 3 Fire-type Flamingos', rewardCoins: 400, rewardXp: 160 },
  { kind: 'catch_type', type: 'Water', target: 3, description: 'Catch 3 Water-type Flamingos', rewardCoins: 400, rewardXp: 160 },
  { kind: 'catch_rare', target: 2, description: 'Catch 2 Rare-or-better Flamingos', rewardCoins: 500, rewardXp: 200 },
  { kind: 'hatch', target: 1, description: 'Hatch a Daycare Egg', rewardCoins: 450, rewardXp: 180 },
  { kind: 'duel_win', target: 3, description: 'Win 3 Flamingo duels', rewardCoins: 500, rewardXp: 200 },
];

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export class QuestService {
  constructor({ userService, progressionService }) {
    this.users = userService;
    this.progression = progressionService;
  }

  async get(userId) {
    const current = this.users.get(userId);
    if (current.dailyQuest?.date === dayKey()) return current;
    return this.users.update(userId, (user) => {
      if (user.dailyQuest?.date !== dayKey()) {
        const template = pick(QUESTS);
        user.dailyQuest = { ...template, date: dayKey(), progress: 0, claimed: false };
      }
    });
  }

  async record(userId, event, payload = {}) {
    return this.users.update(userId, (user) => {
      if (user.dailyQuest?.date !== dayKey()) {
        const template = pick(QUESTS);
        user.dailyQuest = { ...template, date: dayKey(), progress: 0, claimed: false };
      }
      const quest = user.dailyQuest;
      let matches = quest.kind === event;
      if (quest.kind === 'catch_type' && event === 'catch') matches = payload.type === quest.type;
      if (quest.kind === 'catch_rare' && event === 'catch') matches = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(payload.rarity);
      if (matches && !quest.claimed) quest.progress = Math.min(quest.target, quest.progress + 1);
    });
  }

  async claim(userId) {
    let result = { ok: false, reason: 'Your quest is not complete.' };
    await this.users.update(userId, (user) => {
      const quest = user.dailyQuest;
      if (!quest || quest.date !== dayKey()) {
        result = { ok: false, reason: 'Use the quest command first to receive today’s quest.' };
      } else if (quest.claimed) {
        result = { ok: false, reason: 'You already claimed today’s quest reward.' };
      } else if (quest.progress < quest.target) {
        result = { ok: false, reason: `Quest progress is ${quest.progress}/${quest.target}.` };
      } else {
        quest.claimed = true;
        user.shrimpCoins += quest.rewardCoins;
        user.ascensionSigils += 1;
        user.items.shrimp_treat = (user.items.shrimp_treat ?? 0) + 1;
        addXp(user, quest.rewardXp);
        result = { ok: true, quest: structuredClone(quest), creatureXp: 125, sigils: 1 };
      }
    }, { flush: true });
    if (result.ok) result.progression = await this.progression.awardTeam(userId, result.creatureXp);
    return result;
  }
}
