'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/features/auth/use-session';
import { ChildChip } from '@/features/child-profile/child-chip';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { storyThumbnail } from '@/features/story/images';
import { getGrowth } from '@/features/wordbook/api';
import { ImageSlot, Screen, Stack, SubHeader, TabBar } from '@/shared/ui';

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
      <SubHeader
        title="내 활동 기록"
        backHref="/me"
        backLabel=""
        right={<ChildChip list={child.list} selected={child.selected} onSelect={child.select} />}
      />

      <Stack gap="lg" className="mx-auto w-full max-w-5xl pt-8">
        <Stack gap="sm" align="center">
          <h2 className="text-display font-extrabold text-ink">내 활동 기록</h2>
          <p className="text-bubble text-ink-soft">내가 끝낸 이야기를 다시 볼 수 있어요.</p>
        </Stack>

        {done.length === 0 ? (
          <Stack gap="sm" align="center" className="py-16">
            <p className="text-body font-semibold text-ink">아직 끝낸 이야기가 없어요.</p>
            <p className="text-caption text-ink-soft">이야기를 하나 끝내면 여기에 남아요.</p>
          </Stack>
        ) : (
          <ul className="flex flex-wrap justify-center gap-6">
            {done.map((session) => (
              <li key={session.sessionId} className="flex w-80">
                <Link
                  href={`/sessions/${session.sessionId}/complete`}
                  className="flex w-full flex-col overflow-hidden rounded-card border border-line bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                >
                  {/* recentSessions 에 storyId 가 없다 — 썸네일 매핑이 이야기 불문 동일해 0 으로 둔다 */}
                  <ImageSlot
                    src={storyThumbnail(0)}
                    label="Story Scene Image"
                    size="bare"
                    className="h-44 w-full rounded-none border-0"
                  />
                  <Stack
                    direction="row"
                    align="center"
                    justify="between"
                    gap="sm"
                    className="p-4"
                  >
                    <span className="text-bubble font-bold text-ink">{session.storyTitle}</span>
                    <span className="rounded-full bg-done px-3 py-1 text-[12px] font-bold text-cta-ink">
                      완료
                    </span>
                  </Stack>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <TabBar />
    </Screen>
  );
}
