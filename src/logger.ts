/** Logger used for SDK diagnostics. Methods should not throw. */
export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface PrimusNetworkOptions {
  /** Defaults to console.log, console.warn and console.error. */
  logger?: Logger;
}

export const defaultLogger: Logger = {
  // Preserve the console methods and arguments used before logger configuration.
  // eslint-disable-next-line no-console
  info: (...args) => console.log(...args),
  // eslint-disable-next-line no-console
  warn: (...args) => console.warn(...args),
  // eslint-disable-next-line no-console
  error: (...args) => console.error(...args),
};
