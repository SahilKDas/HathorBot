import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const clone = (value) => value == null ? value : structuredClone(value);

export class JsonStore {
  constructor(filePath, { writeDelayMs = 75 } = {}) {
    this.filePath = filePath;
    this.backupPath = `${filePath}.bak`;
    this.writeDelayMs = writeDelayMs;
    this.document = { version: 1, records: {} };
    this.loaded = false;
    this.dirty = false;
    this.timer = null;
    this.operationQueue = Promise.resolve();
    this.flushQueue = Promise.resolve();
  }

  async init() {
    if (this.loaded) return;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (parsed && typeof parsed === 'object' && parsed.records && typeof parsed.records === 'object') {
        this.document = { version: Number(parsed.version) || 1, records: parsed.records };
      } else {
        throw new Error('Expected an object with a records property');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        const recovered = await this.#recoverBackup(error);
        if (!recovered) throw new Error(`Cannot load ${this.filePath}: ${error.message}`);
      }
      this.dirty = true;
      await this.flush();
    }
    this.loaded = true;
  }

  async #recoverBackup(originalError) {
    try {
      const parsed = JSON.parse(await readFile(this.backupPath, 'utf8'));
      if (!parsed?.records || typeof parsed.records !== 'object') return false;
      this.document = parsed;
      console.warn(`[database] Recovered ${path.basename(this.filePath)} from backup after: ${originalError.message}`);
      this.dirty = true;
      return true;
    } catch {
      return false;
    }
  }

  get(id) {
    return clone(this.document.records[id] ?? null);
  }

  has(id) {
    return Object.hasOwn(this.document.records, id);
  }

  values() {
    return Object.values(this.document.records).map(clone);
  }

  entries() {
    return Object.entries(this.document.records).map(([id, value]) => [id, clone(value)]);
  }

  async set(id, value, { flush = false } = {}) {
    return this.update(id, () => value, { flush });
  }

  async update(id, updater, { flush = false } = {}) {
    let result;
    this.operationQueue = this.operationQueue.then(async () => {
      const current = clone(this.document.records[id] ?? null);
      const next = await updater(current);
      if (next === undefined) {
        result = current;
        return;
      }
      // Records are never implicitly deleted. Explicit archival fields are safer for player data.
      if (next === null) throw new Error('JsonStore refuses null/deletion updates');
      this.document.records[id] = clone(next);
      this.dirty = true;
      result = clone(next);
      if (!flush) this.#scheduleFlush();
    });
    await this.operationQueue;
    if (flush) await this.flush();
    return result;
  }

  async delete(id, { flush = false } = {}) {
    let existed = false;
    this.operationQueue = this.operationQueue.then(() => {
      if (!Object.hasOwn(this.document.records, id)) return;
      existed = true;
      delete this.document.records[id];
      this.dirty = true;
      if (!flush) this.#scheduleFlush();
    });
    await this.operationQueue;
    if (flush) await this.flush();
    return existed;
  }

  #scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((error) => console.error('[database] Background flush failed:', error));
    }, this.writeDelayMs);
    this.timer.unref?.();
  }

  async flush() {
    await this.operationQueue;
    this.flushQueue = this.flushQueue.then(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      const json = `${JSON.stringify(this.document, null, 2)}\n`;
      try {
        try { await copyFile(this.filePath, this.backupPath); } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        await writeFile(temporaryPath, json, 'utf8');
        await rename(temporaryPath, this.filePath);
      } catch (error) {
        this.dirty = true;
        throw error;
      }
    });
    return this.flushQueue;
  }
}
