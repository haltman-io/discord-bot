import type { ClientEvents } from 'discord.js';

import type { BotRuntimeContext } from './runtime';

export interface BotEvent<Name extends keyof ClientEvents = keyof ClientEvents> {
  readonly name: Name;
  readonly once?: boolean;
  execute(context: BotRuntimeContext, ...args: ClientEvents[Name]): Promise<void> | void;
}
