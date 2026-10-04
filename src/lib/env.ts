/** Resolves an API path against the optional VITE_API_URL base (defaults to same origin). */
export const getApiUrl = (path = ''): string => {
  const base = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';
  return `${base.replace(/\/$/, '')}${path}`;
};
