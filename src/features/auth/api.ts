import { apiRequest } from '@/core/api/client';
import { setTokens } from '@/core/api/auth-token';
import type { AuthTokens, LoginRequest, SignupRequest } from '@/core/api/types';

async function authenticate(path: '/auth/login' | '/auth/signup', body: unknown): Promise<AuthTokens> {
  const tokens = await apiRequest<AuthTokens>(path, { body, auth: false });
  setTokens(tokens);
  return tokens;
}

export function login(request: LoginRequest): Promise<AuthTokens> {
  return authenticate('/auth/login', request);
}

export function signup(request: SignupRequest): Promise<AuthTokens> {
  return authenticate('/auth/signup', request);
}
