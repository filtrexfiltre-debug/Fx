import { safeStorage, STORAGE_KEYS } from './storage';
import { logger } from './logger';
import { getApiUrl } from './env';
import { ApiError, ApiErrorCode } from '../types';
import { mapHttpStatusToErrorCode } from './api-error';

// ============= API CLIENT =============

interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || getApiUrl('');
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  private getAuthToken(): string | null {
    return safeStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  private getHeaders(): Record<string, string> {
    const headers = { ...this.defaultHeaders };
    const token = this.getAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return (await response.text()) as T;
  }

  private createAbortSignal(): AbortSignal {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    return controller.signal;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorCode = mapHttpStatusToErrorCode(response.status);
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorData = (await response.json()) as { message?: string; error?: string };
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignore parse error, use default message
      }

      logger.error(`API Error: ${response.status} - ${errorMessage}`);
      throw new ApiError(errorCode, response.status, errorMessage);
    }

    return this.parseResponse<T>(response);
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`GET ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createAbortSignal(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        'Network request failed',
        error
      );
    }
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`POST ${url}`, body);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: this.createAbortSignal(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        'Network request failed',
        error
      );
    }
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`PUT ${url}`, body);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: this.createAbortSignal(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        'Network request failed',
        error
      );
    }
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`PATCH ${url}`, body);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: this.createAbortSignal(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        'Network request failed',
        error
      );
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`DELETE ${url}`);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: this.createAbortSignal(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        'Network request failed',
        error
      );
    }
  }

  setAuthToken(token: string): void {
    safeStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  clearAuthToken(): void {
    safeStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

export const apiClient = new ApiClient({
  baseUrl: getApiUrl(''),
});
