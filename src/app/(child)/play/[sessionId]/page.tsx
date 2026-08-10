'use client';

// 자리표시 화면 — 다음 작업에서 대화 화면 본체(녹음·STT·TTS·상태 머신)로 교체한다.
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { getSession } from '@/features/story/api';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PlayPage() {
  const authenticated = useRequireAuth();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: authenticated && Number.isFinite(sessionId),
  });

  if (!authenticated || session.isPending) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-10">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        {session.isError || !session.data ? (
          <p role="alert" className="text-body text-ink">
            세션을 불러오지 못했어요.
          </p>
        ) : (
          <>
            <h1 className="text-display font-bold text-ink">{session.data.storyTitle}</h1>
            <div className="rounded-card bg-surface-raised p-4">
              <p className="text-body text-ink">
                {session.data.childName} · 세션 {session.data.sessionId}
              </p>
              <p className="text-body text-ink-soft">
                현재 장면 {session.data.currentSceneId ?? '-'} · 이번 장면에서{' '}
                {session.data.currentChildTurnCount}번 말했어요
              </p>
            </div>
            <p className="text-body text-ink-soft">여기에 대화 화면이 들어옵니다.</p>
          </>
        )}

        <Link href="/home">
          <TouchTarget look="outline" className="w-full">
            홈으로
          </TouchTarget>
        </Link>
      </Stack>
    </Screen>
  );
}
