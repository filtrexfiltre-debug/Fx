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

export const safeStorage = safeLocalStorage;

/** Central registry of localStorage keys shared by the auth/branch context. */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fx_auth_token',
  CURRENT_USER: 'fx_current_user',
  IS_LOGGED_IN: 'fx_is_logged_in',
  BRANCH_ID: 'fx_selected_branch_id',
  IS_GLOBAL_USER: 'fx_is_global_user',
  LEDGER: 'fx_financial_transactions',
  AUDIT_LOGS: 'fx_audit_logs',
} as const;
