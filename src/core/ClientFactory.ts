import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  type ActivityOptions,
  type ClientOptions,
} from 'discord.js';

import type { BotConfig, GatewayIntentName, PartialName } from '../config/types';

export function createDiscordClient(config: BotConfig): Client {
  const options: ClientOptions = {
    allowedMentions: {
      parse: ['users'],
      repliedUser: false,
    },
    failIfNotExists: false,
    intents: config.client.intents.map(resolveGatewayIntent),
    partials: config.client.partials.map(resolvePartial),
    presence: {
      status: config.client.presence.status,
      activities: config.client.presence.activities.map(resolveActivity),
    },
  };

  return new Client(options);
}

function resolveGatewayIntent(name: GatewayIntentName): GatewayIntentBits {
  const value = GatewayIntentBits[name as keyof typeof GatewayIntentBits];

  if (typeof value !== 'number') {
    throw new Error(`Unsupported Discord gateway intent: ${name}`);
  }

  return value;
}

function resolvePartial(name: PartialName): Partials {
  const value = Partials[name as keyof typeof Partials];

  if (typeof value !== 'number') {
    throw new Error(`Unsupported Discord partial: ${name}`);
  }

  return value;
}

function resolveActivity(
  activity: BotConfig['client']['presence']['activities'][number],
): ActivityOptions {
  const value = ActivityType[activity.type];

  if (typeof value !== 'number') {
    throw new Error(`Unsupported Discord activity type: ${activity.type}`);
  }

  return {
    name: activity.name,
    type: value,
    url: activity.url,
  };
}
