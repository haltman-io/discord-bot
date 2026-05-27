import { REST, Routes } from 'discord.js';

import type { BotConfig } from '../config/types';
import type { Logger } from '../logging/logger';
import type { BotCommand } from '../types/command';

interface ExistingApplicationCommand {
  readonly id: string;
  readonly name: string;
}

type DiscordRoute = `/${string}`;

export interface CommandRegistrationResult {
  readonly commandCount: number;
  readonly guildIds: string[];
  readonly scope: BotConfig['commands']['registrationScope'];
}

export class CommandRegistrar {
  private readonly rest: REST;

  public constructor(
    private readonly config: BotConfig,
    token: string,
    private readonly logger: Logger,
  ) {
    this.rest = new REST({ version: '10' }).setToken(token);
  }

  public async register(commands: readonly BotCommand[]): Promise<CommandRegistrationResult> {
    const payload = commands.map((command) => command.data.toJSON());

    if (this.config.commands.registrationScope === 'global') {
      await this.registerGlobalCommands(payload);
      return {
        commandCount: payload.length,
        guildIds: [],
        scope: 'global',
      };
    }

    await this.registerGuildCommands(payload);
    return {
      commandCount: payload.length,
      guildIds: this.config.security.authorizedGuildIds,
      scope: 'guild',
    };
  }

  private async registerGlobalCommands(payload: unknown[]): Promise<void> {
    this.logger.info(`Registering ${payload.length} global application command(s).`);
    const collectionRoute = Routes.applicationCommands(this.config.applicationId);

    if (this.config.commands.deleteUnknownCommands) {
      await this.rest.put(collectionRoute, { body: payload });
      return;
    }

    await this.upsertCommands(
      collectionRoute,
      (commandId) => Routes.applicationCommand(this.config.applicationId, commandId),
      payload,
    );
  }

  private async registerGuildCommands(payload: unknown[]): Promise<void> {
    const guildIds = this.config.security.authorizedGuildIds;
    this.logger.info(
      `Registering ${payload.length} guild application command(s) in ${guildIds.length} authorized guild(s).`,
    );

    await Promise.all(
      guildIds.map(async (guildId) => {
        const collectionRoute = Routes.applicationGuildCommands(this.config.applicationId, guildId);

        if (this.config.commands.deleteUnknownCommands) {
          await this.rest.put(collectionRoute, { body: payload });
          return;
        }

        await this.upsertCommands(
          collectionRoute,
          (commandId) =>
            Routes.applicationGuildCommand(this.config.applicationId, guildId, commandId),
          payload,
        );
      }),
    );
  }

  private async upsertCommands(
    collectionRoute: DiscordRoute,
    commandRoute: (commandId: string) => DiscordRoute,
    payload: unknown[],
  ): Promise<void> {
    const existingCommands = (await this.rest.get(collectionRoute)) as ExistingApplicationCommand[];
    const existingByName = new Map(
      existingCommands.map((command) => [command.name, command] as const),
    );

    await Promise.all(
      payload.map(async (commandPayload) => {
        const commandName = readCommandPayloadName(commandPayload);
        const existingCommand = existingByName.get(commandName);

        if (existingCommand) {
          await this.rest.patch(commandRoute(existingCommand.id), { body: commandPayload });
          return;
        }

        await this.rest.post(collectionRoute, { body: commandPayload });
      }),
    );
  }
}

function readCommandPayloadName(commandPayload: unknown): string {
  if (
    typeof commandPayload !== 'object' ||
    commandPayload === null ||
    !('name' in commandPayload) ||
    typeof commandPayload.name !== 'string'
  ) {
    throw new Error('Application command payload is missing a command name.');
  }

  return commandPayload.name;
}
