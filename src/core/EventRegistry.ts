import { type Client, type ClientEvents } from 'discord.js';
import { pathToFileURL } from 'node:url';

import type { Logger } from '../logging/logger';
import type { BotEvent } from '../types/event';
import type { BotRuntimeContext } from '../types/runtime';
import { findModuleFiles } from '../utils/files';

export interface EventLoadResult {
  readonly files: string[];
  readonly loaded: number;
}

export class EventRegistry {
  private readonly logger: Logger;

  public constructor(
    private readonly client: Client,
    private readonly eventDirectory: string,
    logger: Logger,
  ) {
    this.logger = logger.child('events');
  }

  public async loadAndRegister(context: BotRuntimeContext): Promise<EventLoadResult> {
    const files = await findModuleFiles(this.eventDirectory);
    let loaded = 0;

    for (const file of files) {
      const event = await this.importEvent(file);
      const listener = (...args: ClientEvents[typeof event.name]) => {
        Promise.resolve(event.execute(context, ...args)).catch((error: unknown) => {
          this.logger.error(`Event handler failed: ${String(event.name)}`, error);
        });
      };

      if (event.once) {
        this.client.once(event.name, listener);
      } else {
        this.client.on(event.name, listener);
      }

      loaded += 1;
    }

    this.logger.info(`Loaded ${loaded} event handler(s).`);

    return {
      files,
      loaded,
    };
  }

  private async importEvent(filePath: string): Promise<BotEvent> {
    clearModuleCache(filePath);

    const module = (await import(pathToFileURL(filePath).href)) as {
      default?: unknown;
      event?: unknown;
    };
    const event = module.default ?? module.event;

    if (!isBotEvent(event)) {
      throw new Error(`Event module ${filePath} does not export a valid event.`);
    }

    return event;
  }
}

function clearModuleCache(filePath: string): void {
  try {
    const resolvedPath = require.resolve(filePath);
    delete require.cache[resolvedPath];
  } catch {
    // Native ESM loaders do not expose require cache entries.
  }
}

function isBotEvent(value: unknown): value is BotEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as BotEvent;

  return typeof candidate.name === 'string' && typeof candidate.execute === 'function';
}
