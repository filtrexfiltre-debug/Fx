import { logger } from './logger';
import { ApiErrorCode, ApiError } from '../types';

// ============= API ERROR HANDLER =============

export function mapHttpStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 400:
      return ApiErrorCode.BAD_REQUEST;
    case 500:
    case 502:
    case 503:
      return ApiErrorCode.SERVER_ERROR;
    default:
      return ApiErrorCode.UNKNOWN;
  }
}

export function getApiErrorMessage(error: ApiError): string {
  switch (error.code) {
    case ApiErrorCode.UNAUTHORIZED:
      return 'Oturum süresi dolmuş. Lütfen tekrar giriş yapınız.';
    case ApiErrorCode.FORBIDDEN:
      return 'Bu işlem için yetkiniz yoktur.';
    case ApiErrorCode.NOT_FOUND:
      return 'İstenen kayıt bulunamadı.';
    case ApiErrorCode.BAD_REQUEST:
      return 'Geçersiz istek. Lütfen verilerinizi kontrol ediniz.';
    case ApiErrorCode.SERVER_ERROR:
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyiniz.';
    case ApiErrorCode.NETWORK_ERROR:
      return 'İnternet bağlantınız kesilmiş. Lütfen kontrol ediniz.';
    default:
      return 'Bilinmeyen bir hata oluştu.';
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    logger.error('Network error', error);
    return new ApiError(
      ApiErrorCode.NETWORK_ERROR,
      0,
      'İnternet bağlantısı başarısız',
      error
    );
  }

  logger.error('Unexpected error', error);
  return new ApiError(
    ApiErrorCode.UNKNOWN,
    500,
    'Beklenmeyen hata oluştu',
    error
  );
}

// ============= RETRY LOGIC =============

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delay: 1000,
  backoff: true,
};

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`, error);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
