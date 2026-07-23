import { randomInt } from 'node:crypto';

function power(creature) {
  return Object.values(creature.stats).reduce((sum, stat) => sum + stat, 0) + creature.ivPercentage + creature.level * 4;
}

export class DuelService {
  constructor({ database, userService, questService }) {
    this.database = database;
    this.users = userService;
    this.quests = questService;
  }

  strongest(user) {
    return user.inventory
      .map((id) => this.database.creatures.get(id))
      .filter(Boolean)
      .sort((a, b) => power(b) - power(a))[0] ?? null;
  }

  async duel(challengerId, opponentId) {
    if (challengerId === opponentId) return { ok: false, reason: 'You cannot duel yourself.' };
    const challenger = this.users.get(challengerId);
    const opponent = this.users.get(opponentId);
    const first = this.strongest(challenger);
    const second = this.strongest(opponent);
    if (!first || !second) return { ok: false, reason: 'Both players need at least one Flamingo.' };
    const now = Date.now();
    if (Number(challenger.cooldowns.duel) > now) return { ok: false, reason: 'Your flock needs a minute before another duel.' };

    const firstPower = power(first) * (0.85 + randomInt(31) / 100);
    const secondPower = power(second) * (0.85 + randomInt(31) / 100);
    const winnerId = firstPower >= secondPower ? challengerId : opponentId;
    const loserId = winnerId === challengerId ? opponentId : challengerId;
    await this.users.update(challengerId, (user) => { user.cooldowns.duel = now + 60_000; });
    await this.users.update(winnerId, (user) => { user.statistics.duelWins += 1; user.shrimpCoins += 50; });
    await this.users.update(loserId, (user) => { user.statistics.duelLosses += 1; });
    await this.quests.record(winnerId, 'duel_win');
    return { ok: true, first, second, winnerId, firstPower, secondPower };
  }
}
