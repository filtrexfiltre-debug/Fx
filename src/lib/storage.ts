/**
 * FX ERP - Safe Storage Utilities
 * Provides safe localStorage access with error handling and type-safe JSON parsing.
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage erişimi kısıtlanmış olabilir; sessizce atla.
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage erişimi kısıtlanmış olabilir; sessizce atla.
    }
  },
};

export const safeStorage = safeLocalStorage;
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fx_auth_token',
};

/**
 * Reads a boolean value from localStorage safely.
 * Returns fallback if key doesn't exist or value is invalid.
 */
export const readStoredBoolean = (key: string, fallback = false): boolean => {
  const raw = safeLocalStorage.getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
};

/**
 * Reads a JSON value from localStorage safely.
 * Returns fallback if key doesn't exist or parsing fails.
 */
export const readStoredJson = <T>(key: string, fallback: T): T => {
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};
