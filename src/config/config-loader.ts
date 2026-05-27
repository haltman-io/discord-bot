import fs from 'node:fs';
import path from 'node:path';

import {
  activityTypeNames,
  commandRegistrationScopes,
  gatewayIntentNames,
  logLevels,
  partialNames,
  presenceStatusNames,
  type BotConfig,
} from './types';

const snowflakePattern = /^\d{17,20}$/;

export function loadBotConfig(configPath = getDefaultConfigPath()): BotConfig {
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Bot configuration file was not found at ${resolvedPath}`);
  }

  const parsedConfig: unknown = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return validateBotConfig(parsedConfig, resolvedPath);
}

function getDefaultConfigPath(): string {
  return process.env.BOT_CONFIG_PATH ?? path.join('config', 'bot.config.json');
}

function validateBotConfig(value: unknown, sourcePath: string): BotConfig {
  const root = readRecord(value, 'config');
  const applicationId = readString(root, 'applicationId', 'applicationId');
  const defaultLocale = readString(root, 'defaultLocale', 'defaultLocale');

  requireSnowflake(applicationId, 'applicationId');

  const client = readRecord(root.client, 'client');
  const presence = readRecord(client.presence, 'client.presence');
  const commands = readRecord(root.commands, 'commands');
  const security = readRecord(root.security, 'security');
  const rateLimit = readRecord(
    security.perUserCommandRateLimit,
    'security.perUserCommandRateLimit',
  );
  const connection = readRecord(root.connection, 'connection');
  const logging = readRecord(root.logging, 'logging');

  const config: BotConfig = {
    $schema: readOptionalString(root, '$schema', '$schema'),
    applicationId,
    defaultLocale,
    client: {
      intents: readEnumArray(client, 'intents', 'client.intents', gatewayIntentNames),
      partials: readEnumArray(client, 'partials', 'client.partials', partialNames),
      presence: {
        status: readEnum(presence, 'status', 'client.presence.status', presenceStatusNames),
        activities: readActivityList(presence.activities),
      },
    },
    commands: {
      autoRegisterOnStartup: readBoolean(
        commands,
        'autoRegisterOnStartup',
        'commands.autoRegisterOnStartup',
      ),
      registrationScope: readEnum(
        commands,
        'registrationScope',
        'commands.registrationScope',
        commandRegistrationScopes,
      ),
      deleteUnknownCommands: readBoolean(
        commands,
        'deleteUnknownCommands',
        'commands.deleteUnknownCommands',
      ),
    },
    security: {
      ownerUserId: readString(security, 'ownerUserId', 'security.ownerUserId'),
      authorizedGuildIds: readStringArray(
        security,
        'authorizedGuildIds',
        'security.authorizedGuildIds',
      ),
      rejectDirectMessages: readBoolean(
        security,
        'rejectDirectMessages',
        'security.rejectDirectMessages',
      ),
      enforceAuthorizedGuilds: readBoolean(
        security,
        'enforceAuthorizedGuilds',
        'security.enforceAuthorizedGuilds',
      ),
      criticalActionsOwnerOnly: readBoolean(
        security,
        'criticalActionsOwnerOnly',
        'security.criticalActionsOwnerOnly',
      ),
      perUserCommandRateLimit: {
        enabled: readBoolean(rateLimit, 'enabled', 'security.perUserCommandRateLimit.enabled'),
        maxUses: readInteger(rateLimit, 'maxUses', 'security.perUserCommandRateLimit.maxUses', {
          min: 1,
        }),
        windowMs: readInteger(rateLimit, 'windowMs', 'security.perUserCommandRateLimit.windowMs', {
          min: 1000,
        }),
      },
    },
    connection: {
      loginMaxRetries: readInteger(connection, 'loginMaxRetries', 'connection.loginMaxRetries', {
        min: 0,
      }),
      loginRetryBaseDelayMs: readInteger(
        connection,
        'loginRetryBaseDelayMs',
        'connection.loginRetryBaseDelayMs',
        { min: 250 },
      ),
      loginRetryMaxDelayMs: readInteger(
        connection,
        'loginRetryMaxDelayMs',
        'connection.loginRetryMaxDelayMs',
        { min: 1000 },
      ),
      healthCheckIntervalMs: readInteger(
        connection,
        'healthCheckIntervalMs',
        'connection.healthCheckIntervalMs',
        { min: 5000 },
      ),
      unhealthyPingThresholdMs: readInteger(
        connection,
        'unhealthyPingThresholdMs',
        'connection.unhealthyPingThresholdMs',
        { min: 1000 },
      ),
      reconnectOnUnhealthy: readBoolean(
        connection,
        'reconnectOnUnhealthy',
        'connection.reconnectOnUnhealthy',
      ),
      reconnectCooldownMs: readInteger(
        connection,
        'reconnectCooldownMs',
        'connection.reconnectCooldownMs',
        { min: 1000 },
      ),
      gracefulShutdownTimeoutMs: readInteger(
        connection,
        'gracefulShutdownTimeoutMs',
        'connection.gracefulShutdownTimeoutMs',
        { min: 1000 },
      ),
    },
    logging: {
      level: readEnum(logging, 'level', 'logging.level', logLevels),
      directory: readString(logging, 'directory', 'logging.directory'),
    },
  };

  requireSnowflake(config.security.ownerUserId, 'security.ownerUserId');
  config.security.authorizedGuildIds.forEach((guildId, index) => {
    requireSnowflake(guildId, `security.authorizedGuildIds[${index}]`);
  });

  if (
    config.commands.registrationScope === 'guild' &&
    config.security.authorizedGuildIds.length === 0
  ) {
    throw new Error(
      `Invalid bot config at ${sourcePath}: guild command registration requires at least one authorized guild ID.`,
    );
  }

  if (config.connection.loginRetryBaseDelayMs > config.connection.loginRetryMaxDelayMs) {
    throw new Error(
      `Invalid bot config at ${sourcePath}: connection.loginRetryBaseDelayMs cannot be greater than connection.loginRetryMaxDelayMs.`,
    );
  }

  return config;
}

function readRecord(value: unknown, pathLabel: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid bot config: ${pathLabel} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, pathLabel: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid bot config: ${pathLabel} must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  pathLabel: string,
): string | undefined {
  const value = record[key];

  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid bot config: ${pathLabel} must be a non-empty string when set.`);
  }

  return value;
}

function readBoolean(record: Record<string, unknown>, key: string, pathLabel: string): boolean {
  const value = record[key];

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid bot config: ${pathLabel} must be a boolean.`);
  }

  return value;
}

function readInteger(
  record: Record<string, unknown>,
  key: string,
  pathLabel: string,
  options: { min: number },
): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < options.min) {
    throw new Error(
      `Invalid bot config: ${pathLabel} must be an integer greater than or equal to ${options.min}.`,
    );
  }

  return value;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
  pathLabel: string,
): string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`Invalid bot config: ${pathLabel} must be an array.`);
  }

  const values = value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`Invalid bot config: ${pathLabel}[${index}] must be a non-empty string.`);
    }

    return item;
  });

  if (new Set(values).size !== values.length) {
    throw new Error(`Invalid bot config: ${pathLabel} must not contain duplicate values.`);
  }

  return values;
}

function readEnumArray<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  pathLabel: string,
  allowedValues: T,
): Array<T[number]> {
  return readStringArray(record, key, pathLabel).map((value, index) => {
    if (!allowedValues.includes(value)) {
      throw new Error(
        `Invalid bot config: ${pathLabel}[${index}] must be one of: ${allowedValues.join(', ')}.`,
      );
    }

    return value;
  });
}

function readEnum<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  pathLabel: string,
  allowedValues: T,
): T[number] {
  const value = readString(record, key, pathLabel);

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid bot config: ${pathLabel} must be one of: ${allowedValues.join(', ')}.`,
    );
  }

  return value;
}

function readActivityList(value: unknown): BotConfig['client']['presence']['activities'] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid bot config: client.presence.activities must be an array.');
  }

  return value.map((activity, index) => {
    const record = readRecord(activity, `client.presence.activities[${index}]`);
    const type = readEnum(
      record,
      'type',
      `client.presence.activities[${index}].type`,
      activityTypeNames,
    );

    return {
      name: readString(record, 'name', `client.presence.activities[${index}].name`),
      type,
      url: readOptionalString(record, 'url', `client.presence.activities[${index}].url`),
    };
  });
}

function requireSnowflake(value: string, pathLabel: string): void {
  if (!snowflakePattern.test(value)) {
    throw new Error(`Invalid bot config: ${pathLabel} must be a Discord snowflake ID.`);
  }
}
