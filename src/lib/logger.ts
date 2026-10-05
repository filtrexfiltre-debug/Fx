/**
 * FX Enterprise ERP - Uygulama İçi Logger Servisi
 * Standart konsol ve telemetri loglamasını yönetir.
 */

export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

class AppLogger implements ILogger {
  private isDev = typeof window !== 'undefined' ? Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? true) : true;

  info(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.log(`%c[INFO] ${message}`, 'color: #2563eb; font-weight: bold;', ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`%c[WARN] ${message}`, 'color: #d97706; font-weight: bold;', ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`%c[ERROR] ${message}`, 'color: #dc2626; font-weight: bold;', ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.debug(`%c[DEBUG] ${message}`, 'color: #64748b;', ...args);
    }
  }
}

export const logger = new AppLogger();
