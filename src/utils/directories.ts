import fs from 'node:fs';
import path from 'node:path';

export function ensureDirectory(directory: string): void {
  fs.mkdirSync(path.resolve(process.cwd(), directory), { recursive: true });
}
