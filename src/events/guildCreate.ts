import { Events } from 'discord.js';

import type { BotEvent } from '../types/event';

const event: BotEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,
  async execute(context, guild) {
    if (
      context.config.security.enforceAuthorizedGuilds &&
      !context.config.security.authorizedGuildIds.includes(guild.id)
    ) {
      context.logger.warn('Leaving unauthorized guild.', {
        guildId: guild.id,
        guildName: guild.name,
      });
      await guild.leave();
      return;
    }

    context.logger.info('Joined authorized guild.', {
      guildId: guild.id,
      guildName: guild.name,
    });
  },
};

export default event;
