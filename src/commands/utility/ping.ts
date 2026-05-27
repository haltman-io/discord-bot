import { MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { BotCommand } from '../../types/command';
import { formatDuration } from '../../utils/time';

const command: BotCommand = {
  category: 'utility',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency and uptime.'),
  async execute({ client, interaction }) {
    const websocketPing = client.ws.ping >= 0 ? `${client.ws.ping}ms` : 'unavailable';
    const uptime = formatDuration(client.uptime ?? 0);

    await interaction.reply({
      content: `Pong. WebSocket: ${websocketPing}. Uptime: ${uptime}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
