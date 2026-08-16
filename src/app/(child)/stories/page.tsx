'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getStories } from '@/features/story/api';
import { StoryCard, StoryPlaceholderCard } from '@/features/story/story-card';
import { CardRow, cn, Icon, Screen, Stack, TabBar } from '@/shared/ui';

const ALL = '전체';
/** 시안은 목록을 늘 3장으로 채워 둔다 — 모자란 자리는 "준비 중"이 메운다 */
const STORY_SLOTS = 3;

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
    <Screen scrollable className="py-6" data-testid="story-list">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <AppHeader
          list={child.list}
          selected={child.selected}
          onSelect={child.select}
          title="이야기"
        />

        <h2 className="text-title font-bold text-ink-soft">어떤 이야기를 만나볼까?</h2>

        <ul className="flex flex-wrap gap-3" aria-label="주제 필터">
          {[ALL, ...topics].map((name) => (
            <li key={name}>
              <button
                type="button"
                aria-pressed={topic === name}
                onClick={() => setTopic(name)}
                className={cn(
                  'min-h-touch rounded-control border px-4 text-body font-semibold',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
                  topic === name
                    ? 'border-cta bg-cta text-ink'
                    : 'border-line bg-white text-ink-soft',
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
            // 고른 주제에 이야기가 없을 때. "준비 중" 자리로 메우지 않는다 —
            // 자리만 채우면 아이가 필터가 걸린 줄 모른다
            <Stack gap="sm" align="center" className="py-16">
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full bg-surface-subtle text-ink-faint"
              >
                <Icon name="book" className="size-7" />
              </span>
              <p className="text-body font-semibold text-ink">이 주제의 이야기는 아직 없어요.</p>
              <p className="text-caption text-ink-soft">다른 주제를 골라 볼까?</p>
            </Stack>
          ) : (
            <CardRow variant="grid" className="gap-6">
              {stories.data.map((story) => (
                <StoryCard key={story.storyId} story={story} />
              ))}
              {Array.from({ length: Math.max(0, STORY_SLOTS - stories.data.length) }).map((_, i) => (
                <StoryPlaceholderCard key={`slot-${i}`} />
              ))}
            </CardRow>
          ))}
      </Stack>

      <TabBar />
    </Screen>
  );
}
