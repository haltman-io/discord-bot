import { MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { BotCommand } from '../../types/command';

const command: BotCommand = {
  category: 'admin',
  critical: true,
  guildOnly: true,
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('reload-commands')
    .setDescription('Reload local command modules and register application commands.'),
  async execute({ interaction, services }) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const result = await services.reloadCommands();

    await interaction.editReply(`Reloaded and registered ${result.loaded} command(s).`);
  },
};

export default command;
