'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getWords, growthKey, toggleWordFavorite, wordsKey } from '@/features/wordbook/api';
import { WordCard } from '@/features/wordbook/word-card';
import { cn, Icon, Screen, Stack, TabBar, TouchTarget } from '@/shared/ui';

/**
 * 단어장 — 아이가 이야기 중 담은 단어와, 백엔드가 GPT 로 만든 쉬운 뜻·예시.
 *
 * 담기는 대화·내레이션 화면에서 한다(features/wordbook/word-catch.tsx).
 * 여기서는 보여주기와 즐겨찾기만 한다.
 */
export default function WordsPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);
  const childId = child.selected?.childId;
  const queryClient = useQueryClient();
  // 목록은 한 번에 다 받으므로 거르기는 화면에서 한다 — 서버에 필터 파라미터가 없다
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const words = useQuery({
    queryKey: wordsKey(childId),
    queryFn: () => getWords(childId!),
    enabled: authenticated && childId !== undefined,
    /*
     * 뜻은 저장 뒤에 GPT 가 만들어 붙인다(실서버 19~38초).
     * 아직 안 온 단어가 있으면 화면이 스스로 다시 물어본다 — 아이가 새로고침할 이유를 없앤다
     */
    refetchInterval: (query) =>
      query.state.data?.words.some((w) => w.meaning === null) ? 3000 : false,
  });

  const favorite = useMutation({
    mutationFn: toggleWordFavorite,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: wordsKey(childId) });
      await queryClient.invalidateQueries({ queryKey: growthKey(childId) });
    },
  });

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  const list = words.data?.words ?? [];
  const shown = onlyFavorites ? list.filter((word) => word.favorite) : list;
  /*
   * 목록이 오기 전에 빈 상태를 번쩍이면 "단어가 사라졌다"로 읽힌다.
   * 아이를 아직 못 정한 동안도 로딩이다 — 실백엔드에서는 아이 조회가 먼저 끝나야
   * 단어 요청이 나가서, 이 구간을 빼면 "아직 모은 단어가 없어요!" 가 1초쯤 스쳐 지나간다
   */
  const loading = child.query.isPending || (childId !== undefined && words.isPending);

  return (
    <Screen scrollable className="py-6" data-testid="wordbook">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <AppHeader
          title="단어장"
          list={child.list}
          selected={child.selected}
          onSelect={child.select}
        />

        {loading ? (
          <p className="py-16 text-center text-body text-ink-soft">불러오는 중…</p>
        ) : list.length === 0 ? (
          <Stack gap="lg" align="center" className="py-16">
            <div
              aria-hidden
              className="flex h-40 w-52 flex-col items-center justify-center gap-3 rounded-control border border-dashed border-line-strong bg-surface-raised text-ink-faint"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-white">
                <Icon name="close" className="size-6" />
              </span>
              <span className="text-caption">Vocabulary Empty Illustration</span>
            </div>
            <Stack gap="sm" align="center">
              <p className="text-display font-extrabold text-ink">아직 모은 단어가 없어요!</p>
              <p className="text-bubble text-ink-soft">
                이야기를 하다 만난 단어를 여기에서 다시 볼 수 있어요.
              </p>
            </Stack>
            <Link href="/stories">
              <TouchTarget size="lg">이야기 보러 가기</TouchTarget>
            </Link>
          </Stack>
        ) : (
          <Stack gap="md">
            {/* 개수 요약이 곧 필터다 — 이야기 목록(STORY-01)의 주제 칩과 같은 모양 */}
            <ul className="flex flex-wrap gap-3" aria-label="단어 거르기">
              <li>
                <FilterChip active={!onlyFavorites} onClick={() => setOnlyFavorites(false)}>
                  모은 단어 {words.data?.totalCount ?? list.length}개
                </FilterChip>
              </li>
              <li>
                <FilterChip active={onlyFavorites} onClick={() => setOnlyFavorites(true)}>
                  <Icon
                    name="star"
                    className="size-4 fill-ink"
                  />
                  즐겨찾기 {words.data?.favoriteCount ?? 0}개
                </FilterChip>
              </li>
            </ul>

            {shown.length === 0 ? (
              // 단어는 있는데 즐겨찾기만 없는 상태 — 큰 빈 화면("아직 모은 단어가 없어요")은 틀린 안내다
              <Stack gap="md" align="center" className="py-12">
                <p className="text-bubble text-ink-soft">아직 즐겨찾기한 단어가 없어요.</p>
                <p className="text-caption text-ink-faint">
                  단어 카드의 별을 누르면 여기에 모여요.
                </p>
                <TouchTarget look="outline" onClick={() => setOnlyFavorites(false)}>
                  전체 단어 보기
                </TouchTarget>
              </Stack>
            ) : (
              <ul className="flex flex-col gap-3">
                {shown.map((word) => (
                  <WordCard
                    key={word.wordId}
                    word={word}
                    onToggleFavorite={favorite.mutate}
                    busy={favorite.isPending}
                  />
                ))}
              </ul>
            )}
          </Stack>
        )}
      </Stack>

      <TabBar />
    </Screen>
  );
}

/** 개수 요약 겸 필터 — 이야기 목록(STORY-01)의 주제 칩과 같은 모양을 쓴다 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-touch items-center gap-2 rounded-control border px-4 text-body font-semibold',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
        active ? 'border-cta bg-cta text-ink' : 'border-line bg-white text-ink-soft',
      )}
    >
      {children}
    </button>
  );
}
