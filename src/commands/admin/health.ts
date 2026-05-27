import { MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { BotCommand } from '../../types/command';
import { formatDuration } from '../../utils/time';

const command: BotCommand = {
  category: 'admin',
  critical: true,
  guildOnly: true,
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('Show bot runtime health for the configured owner.'),
  async execute({ client, interaction }) {
    await interaction.reply({
      content: [
        `Ready: ${client.isReady() ? 'yes' : 'no'}`,
        `WebSocket ping: ${client.ws.ping >= 0 ? `${client.ws.ping}ms` : 'unavailable'}`,
        `WebSocket status: ${client.ws.status}`,
        `Cached guilds: ${client.guilds.cache.size}`,
        `Uptime: ${formatDuration(client.uptime ?? 0)}`,
      ].join('\n'),
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
