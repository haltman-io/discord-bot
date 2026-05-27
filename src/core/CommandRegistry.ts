import { Collection } from 'discord.js';
import { pathToFileURL } from 'node:url';

import { findModuleFiles } from '../utils/files';
import type { Logger } from '../logging/logger';
import type { BotCommand } from '../types/command';

export interface CommandLoadResult {
  readonly files: string[];
  readonly loaded: number;
}

export class CommandRegistry {
  private readonly logger: Logger;
  private commands = new Collection<string, BotCommand>();

  public constructor(
    private readonly commandDirectory: string,
    logger: Logger,
  ) {
    this.logger = logger.child('commands');
  }

  public get(commandName: string): BotCommand | undefined {
    return this.commands.get(commandName);
  }

  public all(): BotCommand[] {
    return [...this.commands.values()];
  }

  public async load(): Promise<CommandLoadResult> {
    const files = await findModuleFiles(this.commandDirectory);
    const nextCommands = new Collection<string, BotCommand>();

    for (const file of files) {
      const command = await this.importCommand(file);
      const commandName = command.data.toJSON().name;

      if (nextCommands.has(commandName)) {
        throw new Error(`Duplicate command name detected: ${commandName}`);
      }

      nextCommands.set(commandName, command);
    }

    this.commands = nextCommands;
    this.logger.info(`Loaded ${nextCommands.size} command(s).`);

    return {
      files,
      loaded: nextCommands.size,
    };
  }

  private async importCommand(filePath: string): Promise<BotCommand> {
    clearModuleCache(filePath);

    const module = (await import(pathToFileURL(filePath).href)) as {
      default?: unknown;
      command?: unknown;
    };
    const command = module.default ?? module.command;

    if (!isBotCommand(command)) {
      throw new Error(`Command module ${filePath} does not export a valid command.`);
    }

    return command;
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

function isBotCommand(value: unknown): value is BotCommand {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as BotCommand;
  const json = candidate.data?.toJSON();

  return (
    typeof candidate.execute === 'function' &&
    typeof candidate.data?.toJSON === 'function' &&
    typeof json?.name === 'string' &&
    json.name.length > 0
  );
}
