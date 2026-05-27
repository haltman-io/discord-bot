import path from 'node:path';

import type { Client } from 'discord.js';

import { loadBotConfig } from '../config/config-loader';
import { loadEnvironment, type Environment } from '../config/environment';
import type { BotConfig } from '../config/types';
import { Logger } from '../logging/logger';
import type { BotRuntimeContext, BotServices } from '../types/runtime';
import { ensureDirectory } from '../utils/directories';
import { createDiscordClient } from './ClientFactory';
import { CommandRegistry, type CommandLoadResult } from './CommandRegistry';
import { CommandRegistrar, type CommandRegistrationResult } from './CommandRegistrar';
import { ConnectionManager } from './ConnectionManager';
import { EventRegistry } from './EventRegistry';
import { CommandRateLimiter } from './RateLimiter';

export class Bot {
  private readonly commandRegistrar: CommandRegistrar;
  private readonly commands: CommandRegistry;
  private readonly connection: ConnectionManager;
  private readonly client: Client;
  private readonly events: EventRegistry;
  private readonly logger: Logger;
  private readonly rateLimiter = new CommandRateLimiter();
  private readonly services: BotServices;
  private shutdownStarted = false;

  private constructor(
    private readonly config: BotConfig,
    private readonly environment: Environment,
  ) {
    ensureDirectory(config.logging.directory);

    this.logger = new Logger(config.logging.level);
    this.client = createDiscordClient(config);
    const sourceRoot = path.resolve(__dirname, '..');

    this.commands = new CommandRegistry(path.join(sourceRoot, 'commands'), this.logger);
    this.commandRegistrar = new CommandRegistrar(config, environment.discordToken, this.logger);
    this.events = new EventRegistry(this.client, path.join(sourceRoot, 'events'), this.logger);
    this.connection = new ConnectionManager(
      this.client,
      environment.discordToken,
      config,
      this.logger,
    );
    this.services = {
      registerApplicationCommands: () => this.registerApplicationCommands(),
      reloadCommands: () => this.reloadCommands(),
    };
  }

  public static create(): Bot {
    return new Bot(loadBotConfig(), loadEnvironment());
  }

  public async start(): Promise<void> {
    this.registerProcessHandlers();

    await this.commands.load();
    await this.events.loadAndRegister(this.createRuntimeContext());

    if (this.config.commands.autoRegisterOnStartup) {
      await this.registerApplicationCommands();
    }

    await this.connection.loginWithRetry();
  }

  private createRuntimeContext(): BotRuntimeContext {
    return {
      client: this.client,
      commands: this.commands,
      config: this.config,
      logger: this.logger,
      rateLimiter: this.rateLimiter,
      services: this.services,
    };
  }

  private async reloadCommands(): Promise<CommandLoadResult> {
    const result = await this.commands.load();
    await this.registerApplicationCommands();
    return result;
  }

  private async registerApplicationCommands(): Promise<CommandRegistrationResult> {
    const result = await this.commandRegistrar.register(this.commands.all());
    this.logger.info(
      `Registered ${result.commandCount} application command(s) with ${result.scope} scope.`,
      result.guildIds.length > 0 ? { guildIds: result.guildIds } : undefined,
    );
    return result;
  }

  private registerProcessHandlers(): void {
    process.once('SIGINT', () => {
      void this.shutdown('SIGINT', 0);
    });

    process.once('SIGTERM', () => {
      void this.shutdown('SIGTERM', 0);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled promise rejection.', reason);
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception.', error);
      void this.shutdown('uncaughtException', 1);
    });
  }

  private async shutdown(reason: string, exitCode: number): Promise<void> {
    if (this.shutdownStarted) {
      return;
    }

    this.shutdownStarted = true;

    try {
      await this.connection.shutdown(reason);
    } finally {
      process.exit(exitCode);
    }
  }
}
