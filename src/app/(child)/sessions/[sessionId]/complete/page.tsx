'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { getSession } from '@/features/story/api';
import { FINALE_IMAGE } from '@/features/story/images';
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
    <Screen scrollable className="justify-center py-10" data-testid="session-complete">
      <Stack gap="lg" align="center" className="mx-auto w-full max-w-lg">
        <ImageSlot
          src={FINALE_IMAGE}
          label="완주 일러스트"
          size="bare"
          className="h-44 w-60 rounded-card"
        />

        <Stack gap="sm" align="center" className="pt-2">
          <h1 className="text-[28px] leading-tight font-extrabold text-ink">
            오늘의 이야기를 모두 마쳤어!
          </h1>
          <p className="text-bubble text-ink-soft">네 생각을 잘 들려줘서 고마워.</p>
        </Stack>

        <Stack
          direction="row"
          align="center"
          justify="between"
          gap="md"
          className="w-80 rounded-cta border border-line bg-white px-5 py-4"
        >
          <span className="flex items-center gap-3 text-bubble font-bold text-ink">
            {/* 시안: 진한 원 안에 흰 체크 */}
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tab-active text-cta-ink"
            >
              <Icon name="check" className="size-4" />
            </span>
            {storyTitle}
          </span>
          <span className="text-caption text-ink-soft">이야기 완료</span>
        </Stack>

        <Stack gap="sm" align="center" className="w-full pt-4">
          <Link href="/home">
            <TouchTarget size="lg" className="w-56">
              홈으로 가기
            </TouchTarget>
          </Link>
          {storyId !== undefined && (
            <Link href={`/stories/${storyId}`}>
              <TouchTarget look="outline" className="w-48">
                이야기 다시 보기
              </TouchTarget>
            </Link>
          )}
          <p className="pt-4 text-caption text-ink-faint">다른 이야기도 만나보자!</p>
        </Stack>
      </Stack>
    </Screen>
  );
}
