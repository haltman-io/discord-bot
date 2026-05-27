export const gatewayIntentNames = [
  'Guilds',
  'GuildMembers',
  'GuildModeration',
  'GuildExpressions',
  'GuildIntegrations',
  'GuildWebhooks',
  'GuildInvites',
  'GuildVoiceStates',
  'GuildPresences',
  'GuildMessages',
  'GuildMessageReactions',
  'GuildMessageTyping',
  'DirectMessages',
  'DirectMessageReactions',
  'DirectMessageTyping',
  'MessageContent',
  'GuildScheduledEvents',
  'AutoModerationConfiguration',
  'AutoModerationExecution',
  'GuildMessagePolls',
  'DirectMessagePolls',
] as const;

export const partialNames = [
  'User',
  'Channel',
  'GuildMember',
  'Message',
  'Reaction',
  'GuildScheduledEvent',
  'ThreadMember',
  'Poll',
] as const;

export const activityTypeNames = [
  'Playing',
  'Streaming',
  'Listening',
  'Watching',
  'Custom',
  'Competing',
] as const;

export const presenceStatusNames = ['online', 'idle', 'dnd', 'invisible'] as const;
export const commandRegistrationScopes = ['guild', 'global'] as const;
export const logLevels = ['debug', 'info', 'warn', 'error'] as const;

export type GatewayIntentName = (typeof gatewayIntentNames)[number];
export type PartialName = (typeof partialNames)[number];
export type ActivityTypeName = (typeof activityTypeNames)[number];
export type PresenceStatusName = (typeof presenceStatusNames)[number];
export type CommandRegistrationScope = (typeof commandRegistrationScopes)[number];
export type LogLevel = (typeof logLevels)[number];

export interface BotConfig {
  readonly $schema?: string;
  readonly applicationId: string;
  readonly defaultLocale: string;
  readonly client: {
    readonly intents: GatewayIntentName[];
    readonly partials: PartialName[];
    readonly presence: {
      readonly status: PresenceStatusName;
      readonly activities: Array<{
        readonly name: string;
        readonly type: ActivityTypeName;
        readonly url?: string;
      }>;
    };
  };
  readonly commands: {
    readonly autoRegisterOnStartup: boolean;
    readonly registrationScope: CommandRegistrationScope;
    readonly deleteUnknownCommands: boolean;
  };
  readonly security: {
    readonly ownerUserId: string;
    readonly authorizedGuildIds: string[];
    readonly rejectDirectMessages: boolean;
    readonly enforceAuthorizedGuilds: boolean;
    readonly criticalActionsOwnerOnly: boolean;
    readonly perUserCommandRateLimit: {
      readonly enabled: boolean;
      readonly maxUses: number;
      readonly windowMs: number;
    };
  };
  readonly connection: {
    readonly loginMaxRetries: number;
    readonly loginRetryBaseDelayMs: number;
    readonly loginRetryMaxDelayMs: number;
    readonly healthCheckIntervalMs: number;
    readonly unhealthyPingThresholdMs: number;
    readonly reconnectOnUnhealthy: boolean;
    readonly reconnectCooldownMs: number;
    readonly gracefulShutdownTimeoutMs: number;
  };
  readonly logging: {
    readonly level: LogLevel;
    readonly directory: string;
  };
}
