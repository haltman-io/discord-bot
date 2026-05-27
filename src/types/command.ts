import type {
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';

import type { BotConfig } from '../config/types';
import type { Logger } from '../logging/logger';
import type { BotServices } from './runtime';

export type ApplicationCommandJson = RESTPostAPIApplicationCommandsJSONBody;

export interface ApplicationCommandData {
  toJSON(): ApplicationCommandJson;
}

export interface CommandExecuteContext {
  readonly interaction: ChatInputCommandInteraction;
  readonly client: Client;
  readonly config: BotConfig;
  readonly logger: Logger;
  readonly services: BotServices;
}

export interface BotCommand {
  readonly data: ApplicationCommandData;
  readonly category?: string;
  readonly guildOnly?: boolean;
  readonly ownerOnly?: boolean;
  readonly critical?: boolean;
  execute(context: CommandExecuteContext): Promise<void> | void;
}
