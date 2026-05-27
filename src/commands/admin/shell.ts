import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';

import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

import type { BotCommand } from '../../types/command';

const COMMAND_OPTION_NAME = 'command';
const DISCORD_MESSAGE_LIMIT = 2000;
const OUTPUT_CHUNK_LIMIT = 1600;
const HEADER_COMMAND_LIMIT = 240;

interface ShellResult {
  readonly output: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly failedToStart?: string;
}

const command: BotCommand = {
  category: 'admin',
  critical: true,
  guildOnly: true,
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('shell')
    .setDescription('Run a Bash command on the host.')
    .addStringOption((option) =>
      option
        .setName(COMMAND_OPTION_NAME)
        .setDescription('Command to execute with bash -lc.')
        .setRequired(true),
    ),
  async execute({ interaction, logger }) {
    const shellCommand = interaction.options.getString(COMMAND_OPTION_NAME, true).trim();

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (shellCommand.length === 0) {
      await interaction.editReply('Provide a non-empty command.');
      return;
    }

    logger.warn('Executing owner shell command.', {
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    const result = await runBashCommand(shellCommand);

    logger.info('Owner shell command finished.', {
      exitCode: result.exitCode,
      failedToStart: Boolean(result.failedToStart),
      signal: result.signal,
    });

    await sendShellResponse(interaction, shellCommand, result);
  },
};

export default command;

function runBashCommand(commandText: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    const stdoutDecoder = new StringDecoder('utf8');
    const stderrDecoder = new StringDecoder('utf8');
    const outputParts: string[] = [];
    let settled = false;

    const child = spawn('bash', ['-lc', `exec 2>&1\n${commandText}`], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: process.env.TERM ?? 'xterm-256color',
      },
      windowsHide: true,
    });

    child.stdout.on('data', (chunk: Buffer) => {
      outputParts.push(stdoutDecoder.write(chunk));
    });

    child.stderr.on('data', (chunk: Buffer) => {
      outputParts.push(stderrDecoder.write(chunk));
    });

    child.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        exitCode: null,
        failedToStart: formatError(error),
        output: collectOutput(outputParts, stdoutDecoder, stderrDecoder),
        signal: null,
      });
    });

    child.on('close', (exitCode, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        exitCode,
        output: collectOutput(outputParts, stdoutDecoder, stderrDecoder),
        signal,
      });
    });
  });
}

function collectOutput(
  outputParts: string[],
  stdoutDecoder: StringDecoder,
  stderrDecoder: StringDecoder,
): string {
  const finalStdout = stdoutDecoder.end();
  const finalStderr = stderrDecoder.end();

  if (finalStdout.length > 0) {
    outputParts.push(finalStdout);
  }

  if (finalStderr.length > 0) {
    outputParts.push(finalStderr);
  }

  return outputParts.join('');
}

async function sendShellResponse(
  interaction: ChatInputCommandInteraction,
  shellCommand: string,
  result: ShellResult,
): Promise<void> {
  const output = normalizeOutput(result.output || '(no output)');
  const chunks = splitOutput(output, OUTPUT_CHUNK_LIMIT);
  const totalChunks = chunks.length;
  const messages = chunks.map((chunk, index) =>
    formatShellMessage(shellCommand, result, chunk, index + 1, totalChunks),
  );
  const firstMessage = messages[0] ?? formatShellMessage(shellCommand, result, '(no output)', 1, 1);

  await interaction.editReply({
    allowedMentions: {
      parse: [],
    },
    content: firstMessage,
  });

  for (const message of messages.slice(1)) {
    await interaction.followUp({
      allowedMentions: {
        parse: [],
      },
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  }
}

function formatShellMessage(
  shellCommand: string,
  result: ShellResult,
  outputChunk: string,
  chunkIndex: number,
  totalChunks: number,
): string {
  const header = [
    `Shell output ${chunkIndex}/${totalChunks}`,
    `$ ${truncate(shellCommand, HEADER_COMMAND_LIMIT)}`,
    formatStatus(result),
  ].join('\n');
  const outputBlock = formatOutputBlock(outputChunk);
  const message = `${header}\n${outputBlock}`;

  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  const availableOutputLength = Math.max(DISCORD_MESSAGE_LIMIT - header.length - 1, 0);
  return `${header}\n${outputChunk.slice(0, availableOutputLength)}`;
}

function formatStatus(result: ShellResult): string {
  if (result.failedToStart) {
    return `failed to start: ${result.failedToStart}`;
  }

  if (result.signal) {
    return `signal: ${result.signal}`;
  }

  return `exit code: ${result.exitCode ?? 'unknown'}`;
}

function formatOutputBlock(output: string): string {
  const longestBacktickRun = findLongestRun(output, '`');

  if (longestBacktickRun > 10) {
    return output;
  }

  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));
  const suffix = output.endsWith('\n') ? fence : `\n${fence}`;

  return `${fence}text\n${output}${suffix}`;
}

function splitOutput(output: string, maxLength: number): string[] {
  if (output.length <= maxLength) {
    return [output];
  }

  const chunks: string[] = [];
  let remainingOutput = output;

  while (remainingOutput.length > maxLength) {
    let splitAt = remainingOutput.lastIndexOf('\n', maxLength);

    if (splitAt < Math.floor(maxLength / 2)) {
      splitAt = maxLength;
    } else {
      splitAt += 1;
    }

    chunks.push(remainingOutput.slice(0, splitAt));
    remainingOutput = remainingOutput.slice(splitAt);
  }

  if (remainingOutput.length > 0) {
    chunks.push(remainingOutput);
  }

  return chunks;
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function findLongestRun(value: string, character: string): number {
  let longestRun = 0;
  let currentRun = 0;

  for (const currentCharacter of value) {
    if (currentCharacter === character) {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
      continue;
    }

    currentRun = 0;
  }

  return longestRun;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
