type LogArguments = unknown[];

export const logger = {
  debug(message: string, ...details: LogArguments): void {
    console.debug(message, ...details);
  },
  warn(message: string, ...details: LogArguments): void {
    console.warn(message, ...details);
  },
  error(message: string, ...details: LogArguments): void {
    console.error(message, ...details);
  },
};
