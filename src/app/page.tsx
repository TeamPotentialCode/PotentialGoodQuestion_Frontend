'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';

// 토큰이 localStorage 에 있어 서버에서는 판단할 수 없다 — 진입 즉시 클라이언트에서 분기한다
export default function RootPage() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session === null) return; // 아직 판단 전
    router.replace(session ? '/home' : '/login');
  }, [session, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-body text-ink-soft">불러오는 중…</p>
    </main>
  );
}
