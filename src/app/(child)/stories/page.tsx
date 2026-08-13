'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getStories } from '@/features/story/api';
import { StoryCard } from '@/features/story/story-card';
import { CardRow, cn, Screen, Stack, TabBar } from '@/shared/ui';

const ALL = '전체';

export default function StoriesPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);
  const [topic, setTopic] = useState(ALL);

  const stories = useQuery({
    queryKey: ['stories', topic],
    queryFn: () => getStories(topic === ALL ? undefined : topic),
    enabled: authenticated,
  });

  // 필터 칩은 고정 문자열로 박지 않고 받아온 이야기의 주제에서 만든다 — 이야기가 늘면 칩도 따라 는다.
  // 전체 목록을 따로 보는 이유는, 필터를 건 상태의 결과로 칩을 만들면 칩이 하나로 줄어들기 때문이다.
  // 키가 ['stories', 전체] 로 같아서 전체를 보고 있을 때는 요청이 한 번만 나간다
  const all = useQuery({
    queryKey: ['stories', ALL],
    queryFn: () => getStories(),
    enabled: authenticated,
  });
  const topics = [...new Set((all.data ?? []).flatMap((s) => s.topics))];

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-8" data-testid="story-list">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack direction="row" align="start" justify="between" gap="md">
          <Stack gap="sm">
            <h1 className="text-display font-bold text-ink">이야기</h1>
            <p className="text-caption text-ink-soft">어떤 이야기를 만나볼까?</p>
          </Stack>
          {child.selected && (
            <span className="flex items-center gap-2 text-body text-ink">
              <span aria-hidden className="size-8 rounded-full bg-surface-raised" />
              {child.selected.name}
            </span>
          )}
        </Stack>

        <ul className="flex flex-wrap gap-2" aria-label="주제 필터">
          {[ALL, ...topics].map((name) => (
            <li key={name}>
              <button
                type="button"
                aria-pressed={topic === name}
                onClick={() => setTopic(name)}
                className={cn(
                  'min-h-touch rounded-full border px-5 text-body',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
                  topic === name
                    ? 'border-cta bg-cta text-cta-ink'
                    : 'border-line bg-surface text-ink',
                )}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>

        {stories.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
        {stories.isError && (
          <p role="alert" className="text-body text-ink">
            이야기 목록을 불러오지 못했어요.
          </p>
        )}
        {stories.data &&
          (stories.data.length === 0 ? (
            <p className="text-body text-ink-soft">아직 준비된 이야기가 없어요.</p>
          ) : (
            <CardRow variant="grid">
              {stories.data.map((story) => (
                <StoryCard key={story.storyId} story={story} />
              ))}
            </CardRow>
          ))}
      </Stack>

      <TabBar />
    </Screen>
  );
}
