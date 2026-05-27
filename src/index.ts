import { Bot } from './core/Bot';

async function main(): Promise<void> {
  const bot = Bot.create();
  await bot.start();
}

main().catch((error: unknown) => {
  console.error('[fatal] Bot startup failed.', error);
  process.exit(1);
});
