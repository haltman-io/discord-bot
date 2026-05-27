import type { Client } from 'discord.js';

import type { BotConfig } from '../config/types';
import type { CommandLoadResult, CommandRegistry } from '../core/CommandRegistry';
import type { CommandRegistrationResult } from '../core/CommandRegistrar';
import type { CommandRateLimiter } from '../core/RateLimiter';
import type { Logger } from '../logging/logger';

export interface BotServices {
  reloadCommands(): Promise<CommandLoadResult>;
  registerApplicationCommands(): Promise<CommandRegistrationResult>;
}

export interface BotRuntimeContext {
  readonly client: Client;
  readonly config: BotConfig;
  readonly logger: Logger;
  readonly commands: CommandRegistry;
  readonly rateLimiter: CommandRateLimiter;
  readonly services: BotServices;
}
