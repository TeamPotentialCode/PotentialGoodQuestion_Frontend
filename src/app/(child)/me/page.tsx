'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { Icon, Screen, Stack, TabBar, TouchTarget } from '@/shared/ui';

export default function MyPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);
  const router = useRouter();

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
