import dotenv from 'dotenv';

export interface Environment {
  readonly discordToken: string;
  readonly nodeEnv: string;
}

export function loadEnvironment(): Environment {
  dotenv.config();

  return {
    discordToken: readRequiredEnvironmentValue('DISCORD_TOKEN'),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}

function readRequiredEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0 || value === 'your_bot_token_here') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
