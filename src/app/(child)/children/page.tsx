'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { CardRow, cn, Icon, Screen, Stack, TouchTarget } from '@/shared/ui';

/** CHILD-01 — 활동할 아이를 고른다. 로그인 다음에 항상 거친다 */
export default function ChildrenPage() {
  const authenticated = useRequireAuth();
  const router = useRouter();
  const child = useSelectedChild(authenticated);

  if (!authenticated || child.query.isPending) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  if (child.query.isError) {
    return (
      <Screen scrollable className="py-10">
        <p role="alert" className="text-body text-ink">
          아이 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-6" data-testid="child-select">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack
          direction="row"
          align="center"
          justify="between"
          gap="md"
          className="border-b border-line pb-3"
        >
          <span
            aria-hidden
            className="rounded-card border border-dashed border-line bg-surface-raised px-3 py-1.5 text-caption font-semibold text-ink-soft"
          >
            GOOD QUESTION
          </span>
          <Stack direction="row" align="center" gap="md">
            {/* 보호자 메뉴 화면이 아직 없다 — 자리만 두고 비활성 */}
            <button
              type="button"
              disabled
              title="준비 중이에요"
              className="flex min-h-touch items-center gap-2 rounded-card border border-line px-3 text-body text-ink disabled:opacity-40"
            >
              <Icon name="person" className="size-5" />
              보호자 메뉴
            </button>
            <button
              type="button"
              onClick={() => {
                clearTokens();
                router.replace('/login');
              }}
              className="min-h-touch text-caption font-medium text-ink underline"
            >
              로그아웃
            </button>
          </Stack>
        </Stack>

        <Stack gap="sm" align="center" className="pt-6">
          <h1 className="text-display font-bold text-ink">누가 이야기를 시작하나요?</h1>
          <p className="text-body text-ink-soft">지금 활동할 아이를 선택해 주세요.</p>
        </Stack>

        <CardRow variant="grid" aria-label="아이 목록">
          {child.list.map((c) => {
            const chosen = c.childId === child.selected?.childId;
            return (
              // 선택 버튼 안에 수정 링크를 넣으면 안 된다(중첩 인터랙티브) — 나란히 둔다
              <li
                key={c.childId}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-card border-2 bg-surface p-6',
                  chosen ? 'border-ink' : 'border-line',
                )}
              >
                <button
                  type="button"
                  onClick={() => child.select(c.childId)}
                  aria-pressed={chosen}
                  className="flex flex-col items-center gap-2 rounded-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                >
                  <span
                    aria-hidden
                    className="flex size-20 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
                  >
                    <Icon name="person" className="size-10" />
                  </span>
                  <span className="text-title font-bold text-ink">{c.name}</span>
                  <span className="text-caption text-ink-soft">{c.age}세</span>
                </button>
                <Link
                  href={`/children/${c.childId}/edit`}
                  aria-label={`${c.name} 정보 수정`}
                  className="rounded-full border border-line px-3 py-1 text-caption text-ink-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                >
                  수정
                </Link>
              </li>
            );
          })}

          <li className="flex">
            <Link
              href="/children/new"
              className="flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line p-6 text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
            >
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-title"
              >
                +
              </span>
              <span className="text-body font-semibold">아이 추가</span>
            </Link>
          </li>
        </CardRow>

        <Stack align="center" className="pt-4">
          <TouchTarget
            size="lg"
            disabled={child.selected === undefined}
            onClick={() => {
              if (child.selected) {
                child.select(child.selected.childId);
                router.push('/home');
              }
            }}
            className="w-full max-w-md"
          >
            이 아이로 시작하기
          </TouchTarget>
        </Stack>
      </Stack>
    </Screen>
  );
}
