import type { LogLevel } from '../config/types';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  public constructor(
    private readonly level: LogLevel = 'info',
    private readonly scope?: string,
  ) {}

  public child(scope: string): Logger {
    return new Logger(this.level, this.scope ? `${this.scope}:${scope}` : scope);
  }

  public debug(message: string, metadata?: unknown): void {
    this.write('debug', message, metadata);
  }

  public info(message: string, metadata?: unknown): void {
    this.write('info', message, metadata);
  }

  public warn(message: string, metadata?: unknown): void {
    this.write('warn', message, metadata);
  }

  public error(message: string, metadata?: unknown): void {
    this.write('error', message, metadata);
  }

  private write(level: LogLevel, message: string, metadata?: unknown): void {
    if (levelPriority[level] < levelPriority[this.level]) {
      return;
    }

    const line = `[${new Date().toISOString()}] ${level.toUpperCase()}${this.scopeLabel()} ${message}`;
    const serializedMetadata = serializeMetadata(metadata);

    if (level === 'error') {
      console.error(line, serializedMetadata);
      return;
    }

    if (level === 'warn') {
      console.warn(line, serializedMetadata);
      return;
    }

    console.log(line, serializedMetadata);
  }

  private scopeLabel(): string {
    return this.scope ? ` [${this.scope}]` : '';
  }
}

function serializeMetadata(metadata: unknown): string {
  if (typeof metadata === 'undefined') {
    return '';
  }

  if (metadata instanceof Error) {
    return JSON.stringify({
      name: metadata.name,
      message: metadata.message,
      stack: metadata.stack,
    });
  }

  if (typeof metadata === 'string') {
    return metadata;
  }

  if (
    typeof metadata === 'number' ||
    typeof metadata === 'boolean' ||
    typeof metadata === 'bigint'
  ) {
    return metadata.toString();
  }

  if (typeof metadata === 'symbol') {
    return metadata.description ?? '[symbol]';
  }

  if (typeof metadata === 'function') {
    return metadata.name ? `[function ${metadata.name}]` : '[function]';
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return '[unserializable metadata]';
  }
}
