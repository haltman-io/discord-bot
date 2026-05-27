import { Events } from 'discord.js';

import type { BotEvent } from '../types/event';

const event: BotEvent<Events.GuildDelete> = {
  name: Events.GuildDelete,
  execute(context, guild) {
    context.logger.info('Removed from guild.', {
      guildId: guild.id,
      guildName: guild.name,
    });
  },
};

export default event;
