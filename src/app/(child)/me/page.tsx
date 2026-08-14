'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getGrowth } from '@/features/wordbook/api';
import { ElementRadar } from '@/features/wordbook/element-radar';
import { Icon, Screen, Stack, TabBar, TouchTarget } from '@/shared/ui';

export default function MyPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);
  const router = useRouter();

  const growth = useQuery({
    queryKey: ['growth', child.selected?.childId],
    queryFn: () => getGrowth(child.selected!.childId),
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
    <Screen scrollable className="py-6" data-testid="my-page">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        <AppHeader
          title="마이페이지"
          list={child.list}
          selected={child.selected}
          onSelect={child.select}
        />

        <Stack
          direction="row"
          align="center"
          gap="md"
          className="rounded-card border border-line bg-surface p-5"
        >
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
          >
            <Icon name="person" className="size-8" />
          </span>
          <Stack gap="sm">
            <p className="text-title font-semibold text-ink">{child.selected?.name ?? '아이 없음'}</p>
            {child.selected && <p className="text-caption text-ink-soft">{child.selected.age}세</p>}
            <Link href="/children">
              <TouchTarget size="sm" look="outline">
                아이 바꾸기
              </TouchTarget>
            </Link>
          </Stack>
        </Stack>

        {/* 사고 요소 성장 레이더 — 이야기에서 탐지된 요소가 쌓이는 그래프 */}
        {growth.data && (
          <section
            aria-label="사고력 성장"
            className="rounded-card border border-line bg-surface p-5"
          >
            <Stack gap="sm">
              <Stack direction="row" align="center" justify="between" gap="md">
                <h2 className="text-body font-semibold text-ink">생각이 자라고 있어요</h2>
                <span className="text-caption text-ink-soft">
                  완료한 이야기 {growth.data.completedSessions}개
                </span>
              </Stack>
              <ElementRadar counts={growth.data.elementCounts} />
            </Stack>
          </section>
        )}

        <Link
          href="/me/history"
          className="flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
        >
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
          >
            <Icon name="book" className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-body font-semibold text-ink">내 활동 기록</span>
            <span className="block text-caption text-ink-soft">
              내가 끝낸 이야기를 다시 볼 수 있어요.
            </span>
          </span>
          <Icon name="chevron-down" className="size-5 -rotate-90 text-ink-soft" />
        </Link>

        <button
          type="button"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
          className="mx-auto min-h-touch text-caption text-ink-soft underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
        >
          로그아웃
        </button>
      </Stack>

      <TabBar />
    </Screen>
  );
}
