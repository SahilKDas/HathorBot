import { randomUUID } from 'node:crypto';

export class AuditService {
  constructor(database) {
    this.database = database;
  }

  async record(action, actorId, details = {}) {
    const id = randomUUID();
    const entry = {
      id,
      action,
      actorId: actorId ?? null,
      details: structuredClone(details),
      createdAt: new Date().toISOString(),
    };
    await this.database.audit.set(id, entry, { flush: true });
    return entry;
  }
}
