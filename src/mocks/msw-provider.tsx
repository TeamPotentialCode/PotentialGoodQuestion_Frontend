'use client';

import { useEffect, useState, type ReactNode } from 'react';

// dev + NEXT_PUBLIC_API_BASE_URL 미설정일 때만 MSW를 켠다.
// worker.start()가 끝나기 전에 첫 fetch가 나가면 목을 놓치므로,
// 준비될 때까지 렌더를 보류한다. 조건이 false면 msw는 번들에 포함되지 않는다(동적 import)
const mockingEnabled =
  process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_BASE_URL;

let startPromise: Promise<void> | null = null;

function startWorker(): Promise<void> {
  startPromise ??= import('@/mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledRequest: 'bypass' }).then(() => undefined),
  );
  return startPromise;
}

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!mockingEnabled);

  useEffect(() => {
    if (!mockingEnabled) return;
    let cancelled = false;
    void startWorker().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return children;
}
