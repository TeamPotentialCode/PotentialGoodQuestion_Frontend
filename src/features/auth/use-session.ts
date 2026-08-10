'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { hasSession, subscribeToSession } from '@/core/api/auth-token';

// 서버에는 localStorage 가 없어 로그인 여부를 알 수 없다 → null("아직 모름").
// 이걸 false("로그인 안 됨")와 구분하지 않으면, 하이드레이션 직후 한 프레임 동안
// false 로 읽혀서 새로고침할 때마다 로그인 화면으로 튕긴다
const unknownOnServer = () => null;

/** 로그인 여부. null 은 아직 판단 전(서버 렌더·하이드레이션 시점). */
export function useSession(): boolean | null {
  return useSyncExternalStore(subscribeToSession, hasSession, unknownOnServer);
}

/**
 * 토큰이 확실히 없을 때만 로그인 화면으로 돌려보낸다.
 * 반환값이 true 가 되기 전에는 보호된 내용을 그리지 않는다.
 */
export function useRequireAuth(): boolean {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === false) router.replace('/login');
  }, [session, router]);

  return session === true;
}
