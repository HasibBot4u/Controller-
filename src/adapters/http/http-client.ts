import { ApiResponse, ApiError } from '../../domain/models/index.ts';

export class HttpApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly service: string;
  public readonly requestId: string;

  constructor(errorPayload: ApiError['error'], statusCode: number, requestId: string) {
    super(errorPayload.message);
    this.name = 'HttpApiError';
    this.code = errorPayload.code;
    this.statusCode = statusCode;
    this.retryable = errorPayload.retryable;
    this.service = errorPayload.service;
    this.requestId = requestId;
  }
}

export async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawJson = await response.json().catch(() => null);

  if (!response.ok || !rawJson?.success) {
    const errorPayload = rawJson?.error || {
      code: `HTTP_${response.status}`,
      message: `Request failed with status ${response.status}`,
      retryable: response.status >= 500,
      service: 'http-client',
    };
    throw new HttpApiError(errorPayload, response.status, rawJson?.requestId || 'unknown');
  }

  return rawJson as ApiResponse<T>;
}
