'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getGrowth } from '@/features/wordbook/api';
import { CardRow, Icon, ImageSlot, Screen, Stack, TabBar } from '@/shared/ui';

/**
 * 내 활동 기록 — 끝낸 이야기 목록.
 * 배포본의 `GET /children/{id}/growth` 가 recentSessions 를 주고, 여기서 완료분만 추린다.
 */
export default function MyHistoryPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);

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

  const done = (growth.data?.recentSessions ?? []).filter((s) => s.status === 'COMPLETED');

  return (
    <Screen scrollable className="py-6" data-testid="my-history">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack direction="row" align="center" gap="md">
          <Link
            href="/me"
            className="flex min-h-touch items-center gap-1 text-body text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="back" className="size-5" />
            뒤로
          </Link>
          <div className="flex-1">
            <AppHeader
              title="내 활동 기록"
              list={child.list}
              selected={child.selected}
              onSelect={child.select}
            />
          </div>
        </Stack>

        <Stack gap="sm" align="center">
          <h2 className="text-title font-semibold text-ink">내 활동 기록</h2>
          <p className="text-caption text-ink-soft">내가 끝낸 이야기를 다시 볼 수 있어요.</p>
        </Stack>

        {done.length === 0 ? (
          <Stack gap="sm" align="center" className="py-16">
            <p className="text-body font-semibold text-ink">아직 끝낸 이야기가 없어요.</p>
            <p className="text-caption text-ink-soft">이야기를 하나 끝내면 여기에 남아요.</p>
          </Stack>
        ) : (
          <CardRow variant="grid">
            {done.map((session) => (
              <li key={session.sessionId} className="flex">
                <Link
                  href={`/sessions/${session.sessionId}/complete`}
                  className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                >
                  <ImageSlot label="Story Scene Image" />
                  <Stack direction="row" align="center" justify="between" gap="sm">
                    <span className="text-body font-semibold text-ink">{session.storyTitle}</span>
                    <span className="rounded-full bg-done px-3 py-1 text-caption text-cta-ink">
                      완료
                    </span>
                  </Stack>
                </Link>
              </li>
            ))}
          </CardRow>
        )}
      </Stack>

      <TabBar />
    </Screen>
  );
}
