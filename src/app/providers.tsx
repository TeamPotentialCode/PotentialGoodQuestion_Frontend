'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { getParentId, subscribeToSession } from '@/core/api/auth-token';
// C-01 예외: 오디오 "프라이밍"과 진단 표시만 여기서 한다. 재생·녹음은 여전히 useAudioOwnership 뿐이다
import { audioDiag, audioLog, primeAudio } from '@/core/audio/player';

/**
 * 실기기 원격 진단 — 주소 뒤에 #audio-debug 를 붙이면 구석에 오디오 상태가 뜬다.
 * 아이패드에는 개발자 도구가 없어서, 안 될 때 스크린샷 한 장으로 상태를 받기 위한 창구다
 */
function AudioDebugOverlay() {
  const [snapshot, setSnapshot] = useState<{ head: string; lines: string[] } | null>(null);
  useEffect(() => {
    if (!window.location.hash.includes('audio-debug')) return;
    const timer = setInterval(() => {
      setSnapshot({
        head:
          `ctx=${audioDiag.contextState()} | path=${audioDiag.path}` +
          (audioDiag.error ? ` | err=${audioDiag.error}` : ''),
        // 스크린샷 한 장에 사건 순서가 담기게 최근 10줄을 보여준다
        lines: audioLog.slice(-10),
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  if (!snapshot) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 4,
        left: 4,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        font: '10px/1.5 monospace',
        padding: '4px 8px',
        borderRadius: 6,
        maxWidth: '92vw',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      <div style={{ color: '#fff', borderBottom: '1px solid #444', marginBottom: 2 }}>
        {snapshot.head}
      </div>
      {snapshot.lines.map((entry, i) => (
        <div key={i}>{entry}</div>
      ))}
    </div>
  );
}

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

  /*
   * WebKit(아이패드)은 제스처 없이 시작한 오디오 재생을 막는다.
   * 아무 화면에서든 탭이 일어날 때마다 공유 AudioContext 를 깨워 두면,
   * TTS 가 fetch 뒤 늦게 재생돼도 소리가 난다. iOS 가 백그라운드 복귀 후
   * 컨텍스트를 다시 재우는 경우도 다음 탭이 되살린다 — 그래서 once 가 아니다
   */
  useEffect(() => {
    // 키보드로만 조작하는 사용자도 있다 — 둘 다 제스처다
    document.addEventListener('pointerdown', primeAudio, { capture: true });
    document.addEventListener('keydown', primeAudio, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', primeAudio, { capture: true });
      document.removeEventListener('keydown', primeAudio, { capture: true });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AudioDebugOverlay />
    </QueryClientProvider>
  );
}
