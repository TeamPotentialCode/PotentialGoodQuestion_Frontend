'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { ChildPicker } from '@/features/child-profile/child-picker';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getHome } from '@/features/home/api';
import { StoryList } from '@/features/home/story-list';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function HomePage() {
  const router = useRouter();
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);

  const home = useQuery({
    queryKey: ['home', child.selected?.childId],
    queryFn: () => getHome(child.selected!.childId),
    enabled: authenticated && child.selected !== undefined,
  });

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-10">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        <h1 className="text-display font-bold text-ink">홈</h1>

        <section aria-label="아이" className="flex flex-col gap-2 rounded-card bg-surface-raised p-4">
          <h2 className="text-title font-semibold text-ink">등록된 아이</h2>
          {child.query.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
          {child.query.isError && (
            <p role="alert" className="text-body text-ink">
              아이 목록을 불러오지 못했어요.
            </p>
          )}
          {child.query.data && (
            <Stack gap="sm" align="start">
              {child.list.length === 0 ? (
                <p className="text-body text-ink-soft">아직 등록된 아이가 없어요.</p>
              ) : (
                <ChildPicker list={child.list} selected={child.selected} onSelect={child.select} />
              )}
              <Link href="/children">
                <TouchTarget look={child.list.length === 0 ? 'solid' : 'outline'}>
                  {child.list.length === 0 ? '아이 등록하기' : '아이 관리'}
                </TouchTarget>
              </Link>
            </Stack>
          )}
        </section>

        {child.selected && (
          <>
            <section aria-label="이어하기" className="flex flex-col gap-2">
              <h2 className="text-title font-semibold text-ink">이어하기</h2>
              {home.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
              {home.isError && (
                <p role="alert" className="text-body text-ink">
                  홈 정보를 불러오지 못했어요.
                </p>
              )}
              {home.data &&
                (home.data.continueSession ? (
                  <Link
                    href={`/play/${home.data.continueSession.sessionId}`}
                    className="block rounded-card bg-surface-raised p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                  >
                    <p className="text-title font-semibold text-ink">
                      {home.data.continueSession.storyTitle}
                    </p>
                    <p className="text-body text-ink-soft">
                      {home.data.continueSession.currentSceneOrder !== null
                        ? `${home.data.continueSession.currentSceneOrder}번째 장면까지 진행했어요.`
                        : '아직 시작하지 않았어요.'}
                    </p>
                  </Link>
                ) : (
                  <p className="text-body text-ink-soft">진행 중인 이야기가 없어요.</p>
                ))}
            </section>

            <section aria-label="추천 이야기" className="flex flex-col gap-2">
              <h2 className="text-title font-semibold text-ink">추천 이야기</h2>
              {home.data && <StoryList stories={home.data.recommendedStories} />}
            </section>
          </>
        )}

        <TouchTarget
          look="outline"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
        >
          로그아웃
        </TouchTarget>
      </Stack>
    </Screen>
  );
}
