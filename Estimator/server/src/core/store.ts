import fs from 'fs/promises';
import path from 'path';
import { config } from './config';

export class JsonStore {
  private readonly root: string;

  constructor(root: string = config.dataDir) {
    this.root = root;
  }

  private resolve(key: string): string {
    return path.join(this.root, `${key}.json`);
  }

  async read<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.resolve(key), 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async write<T>(key: string, data: T): Promise<void> {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
  }
}
