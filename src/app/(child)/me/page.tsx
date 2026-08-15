'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { Icon, Screen, Stack, TabBar } from '@/shared/ui';

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
      {/* 헤더는 화면 폭 전체 — 좁은 본문 컬럼(max-w-lg) 밖에 둔다 */}
      <AppHeader
        title="마이페이지"
        list={child.list}
        selected={child.selected}
        onSelect={child.select}
      />

      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        {/*
         * 시안(v6 MY-01)에는 프로필 카드 + 활동 기록만 있다 — 성장 레이더는 화면에서 뺐다
         * (컴포넌트·API 연동은 남아 있어 디자인이 자리를 잡으면 다시 붙일 수 있다)
         */}
        <Stack
          direction="row"
          align="center"
          gap="lg"
          className="mt-24 rounded-card border border-line bg-white p-8"
        >
          <span
            aria-hidden
            className="flex size-24 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-faint"
          >
            <Icon name="person" className="size-10" />
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
