'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { getParentId, subscribeToSession } from '@/core/api/auth-token';

export function Providers({ children }: { children: ReactNode }) {
  // 클라이언트를 state 로 잡아 리렌더마다 새로 만들지 않는다
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // 인증 만료(401)는 client.ts 가 재발급으로 처리하므로 여기서 재시도하지 않는다
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  /*
   * 계정이 바뀌면 캐시를 통째로 비운다.
   *
   * 로그아웃은 토큰만 지우기 때문에, 다른 계정으로 로그인해도 staleTime(30초) 안에는
   * 재조회를 안 하고 앞 계정의 아이·이어하기가 그대로 보였다.
   * 호출부마다 "캐시도 지워라" 를 기억하게 하면 언젠가 빠뜨리므로 여기서 한 번에 감시한다.
   *
   * parentId 를 비교하는 이유는 토큰 재발급과 계정 전환을 갈라야 하기 때문이다 —
   * 세션이 바뀔 때마다 비우면 재발급마다 화면이 깜빡이고 요청이 몰린다.
   */
  useEffect(() => {
    let seen = getParentId();
    return subscribeToSession(() => {
      const now = getParentId();
      if (now === seen) return;
      seen = now;
      queryClient.clear();
      // 앞 계정의 활동 인수인계도 남을 이유가 없다
      try {
        sessionStorage.clear();
      } catch {
        // 저장소가 막혀 있어도 캐시는 이미 비웠다
      }
    });
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
