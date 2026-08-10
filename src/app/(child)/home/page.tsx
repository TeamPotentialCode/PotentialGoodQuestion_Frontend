'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearTokens } from '@/core/api/auth-token';
import type { Child } from '@/core/api/types';
import { useRequireAuth } from '@/features/auth/use-session';
import { getChildren } from '@/features/child-profile/api';
import { getHome } from '@/features/home/api';
import { StoryList } from '@/features/home/story-list';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function HomePage() {
  const router = useRouter();
  const authenticated = useRequireAuth();
  // 아이가 여러 명일 수 있다. 선택값은 화면 상태로만 들고, 기본은 첫 아이
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const children = useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
    enabled: authenticated,
  });

  const childList = children.data ?? [];
  const selectedChild: Child | undefined =
    childList.find((c) => c.childId === selectedChildId) ?? childList[0];

  const home = useQuery({
    queryKey: ['home', selectedChild?.childId],
    queryFn: () => getHome(selectedChild!.childId),
    enabled: authenticated && selectedChild !== undefined,
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
          {children.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
          {children.isError && (
            <p role="alert" className="text-body text-ink">
              아이 목록을 불러오지 못했어요.
            </p>
          )}
          {children.data && (
            <Stack gap="sm" align="start">
              {childList.length === 0 ? (
                <p className="text-body text-ink-soft">아직 등록된 아이가 없어요.</p>
              ) : childList.length === 1 ? (
                <p className="text-body text-ink">
                  {selectedChild?.name} · 만 {selectedChild?.age}세
                </p>
              ) : (
                // 2명 이상일 때만 선택 UI 를 보여준다
                <Stack direction="row" gap="sm" className="flex-wrap">
                  {childList.map((child) => (
                    <TouchTarget
                      key={child.childId}
                      look={child.childId === selectedChild?.childId ? 'solid' : 'outline'}
                      aria-pressed={child.childId === selectedChild?.childId}
                      onClick={() => setSelectedChildId(child.childId)}
                    >
                      {child.name}
                    </TouchTarget>
                  ))}
                </Stack>
              )}
              <Link href="/children">
                <TouchTarget look={childList.length === 0 ? 'solid' : 'outline'}>
                  {childList.length === 0 ? '아이 등록하기' : '아이 관리'}
                </TouchTarget>
              </Link>
            </Stack>
          )}
        </section>

        {selectedChild && (
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
                  <div className="rounded-card bg-surface-raised p-4">
                    <p className="text-title font-semibold text-ink">
                      {home.data.continueSession.storyTitle}
                    </p>
                    <p className="text-body text-ink-soft">
                      {home.data.continueSession.currentSceneOrder !== null
                        ? `${home.data.continueSession.currentSceneOrder}번째 장면까지 진행했어요.`
                        : '아직 시작하지 않았어요.'}
                    </p>
                  </div>
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
