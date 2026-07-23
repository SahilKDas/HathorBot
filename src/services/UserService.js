import { addXp, normalizeUser } from '../models/User.js';

export class UserService {
  constructor(database) {
    this.database = database;
  }

  get(userId) {
    return normalizeUser(this.database.users.get(userId), userId);
  }

  update(userId, updater, options) {
    return this.database.users.update(userId, async (current) => {
      const user = normalizeUser(current, userId);
      const result = await updater(user);
      const next = result ?? user;
      next.updatedAt = new Date().toISOString();
      return next;
    }, options);
  }

  async reward(userId, { coins = 0, xp = 0 }) {
    return this.update(userId, (user) => {
      user.shrimpCoins += coins;
      addXp(user, xp);
    });
  }
}
