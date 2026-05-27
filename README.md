# Discord Bot Template

A reliable TypeScript foundation for Discord bots using Discord.js, dotenv, JSON configuration, automatic command registration, event loading, connection management, and PM2 process supervision.

## Stack

- TypeScript
- Discord.js
- dotenv
- PM2
- ESLint and Prettier

## Project Structure

```text
config/
  bot.config.json          Runtime bot settings and protections
  bot.config.schema.json   JSON schema for editor validation
logs/
  .gitkeep                 Keeps the log directory in git
src/
  commands/
    admin/                 Owner-only and critical commands
    utility/               General commands
  config/                  Environment and JSON config loading
  core/                    Bot runtime, command/event registries, guards, PM2-safe connection logic
  events/                  Discord event handlers
  logging/                 Console logger used by PM2 log files
  types/                   Shared bot contracts
  utils/                   Small runtime utilities
ecosystem.config.cjs       PM2 process configuration
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `DISCORD_TOKEN` in `.env`.

4. Edit `config/bot.config.json`:
   - `applicationId`: Discord application/client ID.
   - `security.ownerUserId`: the only user allowed to run owner-only and critical commands.
   - `security.authorizedGuildIds`: servers allowed to use the bot.
   - `client.intents`: Discord gateway intents needed by your commands/events.

5. Build:

   ```bash
   npm run build
   ```

6. Start locally:

   ```bash
   npm start
   ```

## Development

Run with live reload:

```bash
npm run dev
```

Register commands without starting the bot:

```bash
npm run register
```

Check quality:

```bash
npm run lint
npm run typecheck
```

## PM2

Start with PM2:

```bash
npm run pm2:start
```

Reload after changes:

```bash
npm run pm2:reload
```

Stop:

```bash
npm run pm2:stop
```

The PM2 ecosystem file uses:

- process name `discord-bot`
- `./dist/index.js` script
- project root as `cwd`
- 1 instance
- fork mode
- autorestart enabled
- watch disabled
- `1G` memory restart limit
- separate output and error logs in `logs/`
- log date format `YYYY-MM-DD HH:mm:ss Z`
- default `NODE_ENV=production`

## Built-In Protections

The JSON config controls core safety rules:

- authorized guild allowlist
- automatic leave from unauthorized guilds
- direct-message command rejection
- owner-only critical commands
- per-user command rate limiting
- command registration scope, either guild or global

The starter commands include:

- `/ping`: latency and uptime check
- `/health`: owner-only runtime health check
- `/reload-commands`: owner-only command reload and registration

## Adding Commands

Create a file under `src/commands/<category>/<name>.ts` and export a `BotCommand`:

```ts
import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../../types/command';

const command: BotCommand = {
  data: new SlashCommandBuilder().setName('example').setDescription('Example command.'),
  async execute({ interaction }) {
    await interaction.reply('Done.');
  },
};

export default command;
```

Use `ownerOnly: true` or `critical: true` for sensitive actions.

## Adding Events

Create a file under `src/events/<event>.ts` and export a `BotEvent`:

```ts
import { Events } from 'discord.js';
import type { BotEvent } from '../types/event';

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(context, client) {
    context.logger.info(`Ready as ${client.user.tag}.`);
  },
};

export default event;
```
