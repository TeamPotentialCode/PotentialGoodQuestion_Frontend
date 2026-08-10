// 브라우저 저장소 접근의 유일한 지점.
// 저장하는 것은 토큰뿐이다 — 음성 Blob·아동 발화 원문은 절대 저장하지 않는다(C-07).
// httpOnly 쿠키를 쓰지 않는 이유: Vercel(FE)↔Railway(BE)가 크로스사이트라
// SameSite=None 쿠키가 필요한데 iPad Safari가 서드파티 쿠키를 기본 차단한다.

const ACCESS_KEY = 'gq:accessToken';
const REFRESH_KEY = 'gq:refreshToken';

function storage(): Storage | null {
  // SSR·프리렌더 중에는 localStorage가 없다
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, tokens.accessToken);
  s.setItem(REFRESH_KEY, tokens.refreshToken);
  notify();
}

export function clearTokens(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  notify();
}

export function hasSession(): boolean {
  return getAccessToken() !== null;
}

// --- 구독 (React useSyncExternalStore 용) ---
// 토큰은 React 상태 밖에 있는 외부 저장소다. 화면이 이를 안전하게 읽으려면
// 변경 알림이 필요하다 — 같은 탭은 notify(), 다른 탭은 storage 이벤트로 전달된다.
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
