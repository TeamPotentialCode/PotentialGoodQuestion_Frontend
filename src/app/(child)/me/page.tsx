'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getGrowth, growthKey } from '@/features/wordbook/api';
import { ElementRadar } from '@/features/wordbook/element-radar';
import { Icon, Screen, Stack, TabBar } from '@/shared/ui';

export default function MyPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);
  const childId = child.selected?.childId;
  const router = useRouter();

  const growth = useQuery({
    queryKey: growthKey(childId),
    queryFn: () => getGrowth(childId!),
    enabled: authenticated && childId !== undefined,
  });

  // 담은 단어가 없으면 이 구획은 아예 그리지 않는다 — 빈 카드가 시안보다 나쁘다
  const recentWords = growth.data?.wordStats?.recentWords ?? [];

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-6" data-testid="my-page">
      {/* 헤더는 화면 폭 전체 — 좁은 본문 컬럼(max-w-lg) 밖에 둔다 */}
      <AppHeader
        title="마이페이지"
        list={child.list}
        selected={child.selected}
        onSelect={child.select}
      />

      <Stack gap="md" className="mx-auto w-full max-w-lg pb-6">
        <Stack
          direction="row"
          align="center"
          gap="lg"
          className="mt-6 rounded-card border border-line bg-white p-6"
        >
          <span
            aria-hidden
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-faint"
          >
            <Icon name="person" className="size-9" />
          </span>
          <Stack gap="sm" align="start">
            <p className="text-display font-extrabold text-ink">
              {child.selected?.name ?? '아이 없음'}
              {child.selected && (
                <span className="pl-2 text-bubble font-normal text-ink-soft">
                  {child.selected.age}세
                </span>
              )}
            </p>
            <Link
              href={child.selected ? `/children/${child.selected.childId}/edit` : '/children'}
              className="flex min-h-touch items-center gap-2 rounded-control border border-line-strong bg-white px-4 text-body font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
            >
              <Icon name="pencil" className="size-4" />
              아이 정보 수정
            </Link>
          </Stack>
        </Stack>

        <Link
          href="/me/history"
          className="flex items-center gap-4 rounded-card border border-line bg-white px-5 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
        >
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-soft"
          >
            <Icon name="book" className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-bubble font-bold text-ink">내 활동 기록</span>
            <span className="block pt-0.5 text-caption text-ink-soft">
              내가 끝낸 이야기를 다시 볼 수 있어요.
            </span>
          </span>
          <Icon name="chevron-right" className="size-5 text-ink-soft" />
        </Link>

        {/*
         * 사고 요소 성장 레이더 — 이야기에서 탐지된 요소가 쌓이는 그래프.
         * ElementRadar 가 기록 0 인 경우까지 스스로 안내하므로 여기서 따로 분기하지 않는다
         */}
        <section aria-label="사고력 성장" className="rounded-card border border-line bg-white p-6">
          <Stack gap="md">
            <Stack direction="row" align="center" justify="between" gap="md">
              <h2 className="text-title font-extrabold text-ink">생각이 자라고 있어요</h2>
              <span className="text-caption text-ink-soft">
                이야기 {growth.data?.completedSessions ?? 0}개 완료
              </span>
            </Stack>
            {/* 레이더 자체 폭은 max-w-64 다 — 아이패드 세로 768px 안에 카드가 다 들어오게 조인다 */}
            <div className="mx-auto w-full max-w-52">
              <ElementRadar counts={growth.data?.elementCounts ?? {}} />
            </div>
          </Stack>
        </section>

        {recentWords.length > 0 && (
          <section
            aria-label="이런 단어가 어려웠어요"
            className="rounded-card border border-line bg-white p-6"
          >
            <Stack gap="md">
              <Stack direction="row" align="center" justify="between" gap="md">
                <h2 className="text-title font-extrabold text-ink">이런 단어가 어려웠어요</h2>
                <Link href="/words" className="text-caption font-semibold text-ink underline">
                  단어장 보기
                </Link>
              </Stack>
              <ul className="flex flex-col gap-3">
                {recentWords.map((word) => (
                  <li key={`${word.word}-${word.savedAt}`}>
                    <p className="text-body font-bold text-ink">{word.word}</p>
                    <p className="text-caption text-ink-soft">
                      {word.meaning ?? '뜻을 만들고 있어요…'}
                    </p>
                  </li>
                ))}
              </ul>
            </Stack>
          </section>
        )}

        <button
          type="button"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
          className="mx-auto mt-4 min-h-touch text-body text-ink-faint underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
        >
          로그아웃
        </button>
      </Stack>

      <TabBar />
    </Screen>
  );
}
