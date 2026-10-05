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
      // ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const readStoredBoolean = (key: string, fallback = false): boolean => {
  const raw = safeLocalStorage.getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
};

export const readStoredJson = <T>(key: string, fallback: T): T => {
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};
