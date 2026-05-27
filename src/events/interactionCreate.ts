import { Events } from 'discord.js';

import { replyEphemeral, runCommandGuards } from '../core/guards';
import type { BotEvent } from '../types/event';

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(context, interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = context.commands.get(interaction.commandName);

    if (!command) {
      await replyEphemeral(interaction, 'This command is no longer available.');
      return;
    }

    if (!(await runCommandGuards(context, command, interaction))) {
      return;
    }

    try {
      await command.execute({
        client: context.client,
        config: context.config,
        interaction,
        logger: context.logger.child(`command:${interaction.commandName}`),
        services: context.services,
      });
    } catch (error) {
      context.logger.error(`Command failed: ${interaction.commandName}`, error);
      await replyEphemeral(interaction, 'The command failed unexpectedly. The error was logged.');
    }
  },
};

export default event;
