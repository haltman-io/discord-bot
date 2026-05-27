import { Events, type Client } from 'discord.js';

import type { BotConfig } from '../config/types';
import type { Logger } from '../logging/logger';
import { sleep } from '../utils/sleep';

export class ConnectionManager {
  private healthTimer: NodeJS.Timeout | undefined;
  private lastReconnectAt = 0;
  private reconnecting = false;
  private shuttingDown = false;

  public constructor(
    private readonly client: Client,
    private readonly token: string,
    private readonly config: BotConfig,
    logger: Logger,
  ) {
    this.logger = logger.child('connection');
    this.bindConnectionEvents();
  }

  private readonly logger: Logger;

  public async loginWithRetry(): Promise<void> {
    let attempt = 0;

    while (!this.shuttingDown) {
      try {
        attempt += 1;
        this.logger.info(`Discord login attempt ${attempt}.`);
        await this.client.login(this.token);
        this.startHealthChecks();
        return;
      } catch (error) {
        if (this.reachedMaxLoginRetries(attempt)) {
          this.logger.error('Discord login retries exhausted.', error);
          throw error;
        }

        const delayMs = this.calculateRetryDelay(attempt);
        this.logger.error(`Discord login failed. Retrying in ${delayMs}ms.`, error);
        await sleep(delayMs);
      }
    }
  }

  public async shutdown(reason: string): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.stopHealthChecks();
    this.logger.warn(`Shutting down Discord client. Reason: ${reason}`);

    await Promise.race([
      this.client.destroy(),
      sleep(this.config.connection.gracefulShutdownTimeoutMs),
    ]);
  }

  private bindConnectionEvents(): void {
    this.client.on(Events.ShardReady, (shardId) => {
      this.logger.info(`Shard ${shardId} is ready.`);
    });

    this.client.on(Events.ShardReconnecting, (shardId) => {
      this.logger.warn(`Shard ${shardId} is reconnecting.`);
    });

    this.client.on(Events.ShardResume, (shardId, replayedEvents) => {
      this.logger.info(`Shard ${shardId} resumed. Replayed events: ${replayedEvents}.`);
    });

    this.client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
      this.logger.warn(`Shard ${shardId} disconnected.`, {
        code: closeEvent.code,
        reason: closeEvent.reason,
      });
    });

    this.client.on(Events.ShardError, (error, shardId) => {
      this.logger.error(`Shard ${shardId} emitted an error.`, error);
    });

    this.client.on(Events.Warn, (message) => {
      this.logger.warn(message);
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error('Discord client emitted an error.', error);
    });
  }

  private startHealthChecks(): void {
    this.stopHealthChecks();
    this.healthTimer = setInterval(() => {
      void this.checkHealth();
    }, this.config.connection.healthCheckIntervalMs);
    this.healthTimer.unref();
  }

  private stopHealthChecks(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = undefined;
    }
  }

  private async checkHealth(): Promise<void> {
    if (this.shuttingDown || this.reconnecting || !this.client.isReady()) {
      return;
    }

    const ping = this.client.ws.ping;

    if (!Number.isFinite(ping) || ping < 0) {
      this.logger.warn('Discord websocket ping is unavailable.');
      return;
    }

    if (ping <= this.config.connection.unhealthyPingThresholdMs) {
      this.logger.debug(`Discord websocket ping is healthy: ${ping}ms.`);
      return;
    }

    this.logger.warn(
      `Discord websocket ping is unhealthy: ${ping}ms exceeds ${this.config.connection.unhealthyPingThresholdMs}ms.`,
    );

    if (this.config.connection.reconnectOnUnhealthy) {
      await this.reconnect('unhealthy websocket ping');
    }
  }

  private async reconnect(reason: string): Promise<void> {
    const now = Date.now();

    if (now - this.lastReconnectAt < this.config.connection.reconnectCooldownMs) {
      this.logger.warn(
        `Skipping reconnect because reconnect cooldown is active. Reason: ${reason}`,
      );
      return;
    }

    this.lastReconnectAt = now;
    this.reconnecting = true;
    this.stopHealthChecks();

    try {
      this.logger.warn(`Forcing Discord client reconnect. Reason: ${reason}`);
      await this.client.destroy();
      await sleep(1000);
      await this.loginWithRetry();
    } finally {
      this.reconnecting = false;
    }
  }

  private reachedMaxLoginRetries(attempt: number): boolean {
    const maxRetries = this.config.connection.loginMaxRetries;
    return maxRetries > 0 && attempt >= maxRetries;
  }

  private calculateRetryDelay(attempt: number): number {
    const exponent = Math.max(0, attempt - 1);
    const nextDelay = this.config.connection.loginRetryBaseDelayMs * 2 ** exponent;
    return Math.min(nextDelay, this.config.connection.loginRetryMaxDelayMs);
  }
}
