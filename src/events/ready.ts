import { Events } from 'discord.js';

import type { BotEvent } from '../types/event';

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(context, client) {
    context.logger.info(`Logged in as ${client.user.tag}.`, {
      authorizedGuilds: context.config.security.authorizedGuildIds.length,
      cachedGuilds: client.guilds.cache.size,
      nodeEnv: process.env.NODE_ENV ?? 'development',
    });
  },
};

export default event;
