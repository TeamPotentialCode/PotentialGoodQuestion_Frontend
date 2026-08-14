'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { getSession } from '@/features/story/api';
import { Icon, ImageSlot, Screen, Stack, TouchTarget } from '@/shared/ui';

export default function SessionCompletePage() {
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

  // 이야기 제목을 못 불러와도 완주는 완주다 — 축하 화면은 그대로 보여준다
  const storyTitle = session.data?.storyTitle ?? '오늘의 이야기';
  const storyId = session.data?.storyId;

  return (
    <Screen scrollable className="py-10" data-testid="session-complete">
      <Stack gap="lg" align="center" className="mx-auto w-full max-w-lg">
        <ImageSlot label="완주 일러스트" className="w-full" />

        <Stack gap="sm" align="center">
          <h1 className="text-display font-semibold text-ink">오늘의 이야기를 모두 마쳤어!</h1>
          <p className="text-caption text-ink-soft">네 생각을 잘 들려줘서 고마워.</p>
        </Stack>

        <Stack
          direction="row"
          align="center"
          justify="between"
          gap="md"
          className="w-full rounded-card border border-line bg-surface px-5 py-4"
        >
          <span className="flex items-center gap-3 text-body font-semibold text-ink">
            {/* 시안: 진한 원 안에 흰 체크 */}
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-cta-ink"
            >
              <Icon name="check" className="size-4" />
            </span>
            {storyTitle}
          </span>
          <span className="text-caption text-ink-soft">이야기 완료</span>
        </Stack>

        <Stack gap="sm" align="center" className="w-full">
          <Link href="/home" className="w-full">
            <TouchTarget size="lg" className="w-full">
              홈으로 가기
            </TouchTarget>
          </Link>
          {storyId !== undefined && (
            <Link href={`/stories/${storyId}`} className="w-full">
              <TouchTarget size="lg" look="outline" className="w-full">
                이야기 다시 보기
              </TouchTarget>
            </Link>
          )}
          <p className="text-caption text-ink-soft">다른 이야기도 만나보자!</p>
        </Stack>
      </Stack>
    </Screen>
  );
}
