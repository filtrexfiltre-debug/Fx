/**
 * FX Enterprise Environment Configuration
 * Safe environment access with sensible fallbacks
 */

interface ImportMetaEnv {
  MODE?: string;
  PROD?: boolean;
  DEV?: boolean;
  VITE_API_BASE_URL?: string;
}

const metaEnv = ((import.meta as unknown as { env?: ImportMetaEnv }).env || {}) as ImportMetaEnv;

export const env = {
  NODE_ENV: metaEnv.MODE || 'development',
  IS_PROD: metaEnv.PROD || false,
  IS_DEV: metaEnv.DEV || true,
  API_BASE_URL: metaEnv.VITE_API_BASE_URL || '/api',
  APP_NAME: 'FX ENTERPRISE ERP',
  APP_VERSION: '2.4.0',
  DEFAULT_TENANT_ID: 'filtrex-su-01',
} as const;
