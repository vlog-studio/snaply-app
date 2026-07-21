import type { z } from 'zod';

import { API_BASE_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

import { ApiError } from './api-error';

type QueryValue = string | number | boolean | undefined | null;
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type ApiRequestOptions<T> = {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON; omit for bodyless requests. */
  body?: unknown;
  /** Validates and types the envelope's `data` field. */
  schema: z.ZodType<T>;
  signal?: AbortSignal;
};

/** The common success/failure envelope every endpoint returns. */
type ApiEnvelope =
  | { success: true; data: unknown }
  | { success: false; error?: { code?: string; message?: string } };

function isEnvelope(value: unknown): value is ApiEnvelope {
  return typeof value === 'object' && value !== null && 'success' in value;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) search.append(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/** Attach the current Supabase JWT so protected endpoints authorize the caller. */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The single HTTP entry point for the backend. It owns transport concerns only:
 * URL/query building, JWT injection, the shared response envelope, and error
 * normalization into `ApiError`. It never knows about domain models — callers in
 * an entity/page `api` segment map the validated `data` to their domain type.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions<T>): Promise<T> {
  const { method = 'GET', query, body, schema, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(await authHeader()),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError('network_error', '네트워크 요청에 실패했습니다.', { cause });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError('malformed_response', '서버 응답을 해석할 수 없습니다.', {
      status: response.status,
      cause,
    });
  }

  if (!isEnvelope(payload)) {
    throw new ApiError('malformed_response', '서버 응답 형식이 올바르지 않습니다.', {
      status: response.status,
    });
  }

  if (!payload.success) {
    throw new ApiError(
      payload.error?.code ?? 'unknown_error',
      payload.error?.message ?? '요청을 처리하지 못했습니다.',
      { status: response.status },
    );
  }

  return schema.parse(payload.data);
}
