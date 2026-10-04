/** Minimal console logger; swap for a remote sink in production. */
const isDev = import.meta.env?.DEV ?? false;

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) console.debug(`[fx] ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]) => console.info(`[fx] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(`[fx] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[fx] ${message}`, ...args),
};
