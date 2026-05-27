import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function findModuleFiles(directory: string): Promise<string[]> {
  const entries = await readDirectoryIfExists(directory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findModuleFiles(entryPath);
      }

      if (isLoadableModule(entryPath)) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function readDirectoryIfExists(directory: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function isLoadableModule(filePath: string): boolean {
  return (
    (filePath.endsWith('.ts') || filePath.endsWith('.js')) &&
    !filePath.endsWith('.d.ts') &&
    !filePath.endsWith('.map')
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
