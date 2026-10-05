import { safeLocalStorage } from './storage';
import { env } from './env';
import { ApiError } from '../types';

export { ApiError };

export interface RequestOptions extends RequestInit {
  branchId?: string;
  skipAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { branchId, skipAuth = false, headers = {}, ...rest } = options;
  const token = safeLocalStorage.getItem('fx_auth_token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token && !skipAuth) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (branchId) {
    requestHeaders['X-Branch-Id'] = branchId;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${env.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      let errorDetails: unknown;

      try {
        const errorBody = await response.json();
        if (errorBody && typeof errorBody === 'object') {
          errorMessage = errorBody.message || errorMessage;
          errorCode = errorBody.code;
          errorDetails = errorBody.details;
        }
      } catch {
        // Body JSON değilse varsayılan mesajı koru
      }

      throw new ApiError(response.status, errorMessage, errorCode, errorDetails);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Ağ bağlantı hatası');
  }
}
