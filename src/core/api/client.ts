// HTTP 클라이언트 — 봉투 언랩, Bearer 주입, 401 재발급 재시도, 바이너리 분기를 한곳에 모은다.
// core 레이어라서 react/next를 import 하지 않는다.
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/core/api/auth-token';
import type { ApiEnvelope, AuthTokens } from '@/core/api/types';

// 미설정이면 동일 출처(''), 즉 /api/... → 개발 중에는 MSW가 가로챈다.
// 실백엔드를 붙일 때만 .env.local 에 http://localhost:8081 같은 값을 넣는다
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown; // 객체면 JSON, FormData면 그대로 보낸다
  idempotencyKey?: string;
  auth?: boolean; // 기본 true. 인증 엔드포인트만 false
  signal?: AbortSignal;
}

function buildHeaders(options: RequestOptions, token: string | null): Headers {
  const headers = new Headers();
  // FormData 는 브라우저가 boundary 를 포함해 Content-Type 을 정해야 하므로 건드리지 않는다
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }
  return headers;
}

function toBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

async function rawFetch(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  return fetch(`${BASE_URL}/api${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: buildHeaders(options, token),
    body: toBody(options.body),
    signal: options.signal,
  });
}

// 응답 본문에서 사람이 읽을 메시지와 코드를 최대한 건져낸다.
// 백엔드가 봉투({success,message,data})와 Spring 기본 에러 형식을 섞어 쓰기 때문
async function readError(response: Response): Promise<ApiError> {
  let message = '요청을 처리하지 못했어요.';
  let code: string | null = null;
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      if (typeof record.message === 'string' && record.message.length > 0) message = record.message;
      if (typeof record.code === 'string') code = record.code;
      else if (typeof record.error === 'string') code = record.error;
    }
  } catch {
    // 본문이 비었거나 JSON이 아니면 기본 문구를 쓴다
  }
  return new ApiError(response.status, message, code);
}

let refreshInFlight: Promise<boolean> | null = null;

// 동시 요청이 한꺼번에 401을 받아도 재발급은 한 번만 돈다
async function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await rawFetch('/auth/refresh', { body: { refreshToken }, auth: false }, null);
      if (!response.ok) return false;
      const envelope = (await response.json()) as ApiEnvelope<AuthTokens>;
      if (!envelope.success || !envelope.data) return false;
      setTokens(envelope.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  let response = await rawFetch(path, options, getAccessToken());
  // 액세스 토큰 만료면 한 번만 재발급 후 재시도한다.
  // 재발급 자체가 실패하면 토큰을 버려 화면이 로그인으로 돌아가게 한다
  if (response.status === 401 && options.auth !== false && getRefreshToken()) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      clearTokens();
      throw await readError(response);
    }
    response = await rawFetch(path, options, getAccessToken());
  }
  return response;
}

/** 봉투를 벗겨 data 를 돌려준다. 실패면 ApiError 를 던진다. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (!response.ok) throw await readError(response);

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError(response.status, envelope.message, envelope.code ?? null);
  }
  return envelope.data as T;
}

/** POST /speech/tts 처럼 봉투 없이 audio/mpeg 를 돌려주는 엔드포인트용. */
export async function apiRequestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);
  if (!response.ok) throw await readError(response);
  return response.blob();
}
