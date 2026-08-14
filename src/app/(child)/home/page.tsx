'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getHome } from '@/features/home/api';
import { ContinueCard } from '@/features/home/continue-card';
import { HomeStoryCard, HomeStoryPlaceholderCard } from '@/features/home/home-story-card';
import { loadStoryScenes } from '@/features/play/scene-source';
import { CardRow, Screen, Stack, TabBar, TouchTarget } from '@/shared/ui';

/** 시안은 추천을 늘 3장으로 채워 둔다 — 모자란 자리는 "준비 중"이 메운다 */
const RECOMMENDED_SLOTS = 3;

export default function HomePage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);

  const home = useQuery({
    queryKey: ['home', child.selected?.childId],
    queryFn: () => getHome(child.selected!.childId),
    enabled: authenticated && child.selected !== undefined,
  });

  const cont = home.data?.continueSession ?? null;

  /*
   * 시안의 "장면 2 / 4" 를 만들려면 대화 장면 총 개수가 필요한데 ContinueSession 에 없다.
   * 장면을 훑어 계산하는데(요청 여러 번) 첫 렌더를 막으면 홈이 느려지므로 별도 쿼리로 둔다 —
   * 오기 전에는 그 줄만 비고 카드는 바로 보인다. 백엔드에 필드 추가를 요청해 둔 상태다.
   */
  const scenes = useQuery({
    queryKey: ['story-scenes', cont?.storyId],
    queryFn: () => loadStoryScenes(cont!.storyId),
    enabled: cont !== null,
    staleTime: Infinity,
  });

  const progress = (() => {
    if (!scenes.data || cont?.currentSceneOrder == null) return null;
    const dialogues = scenes.data.filter((s) => s.characterName !== null);
    if (dialogues.length === 0) return null;
    const done = dialogues.filter((s) => s.sceneOrder <= cont.currentSceneOrder!).length;
    return { current: Math.max(1, done), total: dialogues.length };
  })();

  const estimatedMinutes = home.data?.recommendedStories.find(
    (s) => s.storyId === cont?.storyId,
  )?.estimatedMinutes;

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-6" data-testid="home">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <AppHeader list={child.list} selected={child.selected} onSelect={child.select} />

        {child.query.data && child.list.length === 0 ? (
          <Stack gap="md" align="start">
            <h1 className="text-display font-bold text-ink">먼저 아이를 등록해 주세요</h1>
            <p className="text-body text-ink-soft">아이를 등록하면 이야기를 시작할 수 있어요.</p>
            <Link href="/children">
              <TouchTarget size="lg">아이 등록하기</TouchTarget>
            </Link>
          </Stack>
        ) : (
          <>
            <Stack gap="sm">
              <h1 className="text-display font-bold text-ink">
                {child.selected?.name}아, 오늘은 어떤 이야기를 만나볼까?
              </h1>
              <p className="text-body text-ink-soft">캐릭터와 이야기하며 네 생각을 들려줘.</p>
            </Stack>

            <section aria-label="이어서 이야기하기" className="flex flex-col gap-3">
              <h2 className="text-title font-bold text-ink">이어서 이야기하기</h2>
              {home.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
              {home.isError && (
                <p role="alert" className="text-body text-ink">
                  홈 정보를 불러오지 못했어요.
                </p>
              )}
              {home.data &&
                (cont ? (
                  <ContinueCard
                    session={cont}
                    estimatedMinutes={estimatedMinutes}
                    progress={progress}
                  />
                ) : (
                  <p className="text-body text-ink-soft">진행 중인 이야기가 없어요.</p>
                ))}
            </section>

            <section aria-label="오늘의 추천 이야기" className="flex flex-col gap-3">
              <h2 className="text-title font-bold text-ink">오늘의 추천 이야기</h2>
              {home.data && (
                <CardRow variant="grid">
                  {home.data.recommendedStories.map((story) => (
                    <HomeStoryCard key={story.storyId} story={story} />
                  ))}
                  {Array.from({
                    length: Math.max(0, RECOMMENDED_SLOTS - home.data.recommendedStories.length),
                  }).map((_, i) => (
                    <HomeStoryPlaceholderCard key={`slot-${i}`} />
                  ))}
                </CardRow>
              )}
            </section>
          </>
        )}
      </Stack>

      <TabBar />
    </Screen>
  );
}
