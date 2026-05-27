import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import type { BotCommand } from '../types/command';
import type { BotRuntimeContext } from '../types/runtime';

export async function runCommandGuards(
  context: BotRuntimeContext,
  command: BotCommand,
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const config = context.config;

  if ((config.security.rejectDirectMessages || command.guildOnly) && !interaction.guildId) {
    await replyEphemeral(interaction, 'This bot does not accept direct-message commands.');
    return false;
  }

  if (
    config.security.enforceAuthorizedGuilds &&
    interaction.guildId &&
    !config.security.authorizedGuildIds.includes(interaction.guildId)
  ) {
    context.logger.warn('Rejected command from unauthorized guild.', {
      commandName: interaction.commandName,
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
    await replyEphemeral(interaction, 'This server is not authorized to use this bot.');
    return false;
  }

  const requiresOwner =
    command.ownerOnly || (command.critical && config.security.criticalActionsOwnerOnly);

  if (requiresOwner && interaction.user.id !== config.security.ownerUserId) {
    context.logger.warn('Rejected owner-only command from non-owner user.', {
      commandName: interaction.commandName,
      userId: interaction.user.id,
    });
    await replyEphemeral(interaction, 'Only the configured bot owner can use this command.');
    return false;
  }

  const rateLimit = config.security.perUserCommandRateLimit;

  if (rateLimit.enabled) {
    const result = context.rateLimiter.take(
      `${interaction.user.id}:${interaction.commandName}`,
      rateLimit.maxUses,
      rateLimit.windowMs,
    );

    if (!result.allowed) {
      await replyEphemeral(
        interaction,
        `You are using commands too quickly. Try again in ${Math.ceil(result.retryAfterMs / 1000)}s.`,
      );
      return false;
    }
  }

  return true;
}

export async function replyEphemeral(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.deferred) {
      await interaction.editReply({ content });
      return;
    }

    if (interaction.replied) {
      await interaction.followUp({
        content,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    // Nothing else can be done if Discord rejects the interaction response.
  }
}
