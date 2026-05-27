import path from 'node:path';

import { loadBotConfig } from './config/config-loader';
import { loadEnvironment } from './config/environment';
import { CommandRegistry } from './core/CommandRegistry';
import { CommandRegistrar } from './core/CommandRegistrar';
import { Logger } from './logging/logger';

async function main(): Promise<void> {
  const config = loadBotConfig();
  const environment = loadEnvironment();
  const logger = new Logger(config.logging.level);
  const sourceRoot = path.resolve(__dirname);
  const commands = new CommandRegistry(path.join(sourceRoot, 'commands'), logger);
  const registrar = new CommandRegistrar(config, environment.discordToken, logger);

  await commands.load();
  const result = await registrar.register(commands.all());

  logger.info(`Registered ${result.commandCount} command(s) with ${result.scope} scope.`, {
    guildIds: result.guildIds,
  });
}

main().catch((error: unknown) => {
  console.error('[fatal] Command registration failed.', error);
  process.exit(1);
});
