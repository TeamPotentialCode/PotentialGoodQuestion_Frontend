'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { Bleed, cn, Icon, Screen, Stack, TouchTarget } from '@/shared/ui';

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

  const hasChildren = child.list.length > 0;

  return (
    <Screen scrollable className="py-6" data-testid="child-select">
      {/* 상단 바 — 시안은 구분선이 화면 끝까지 간다 */}
      <Bleed top className="border-b border-line">
        <Stack direction="row" align="center" justify="between" gap="md" className="py-3">
          <span
            aria-hidden
            className="rounded-control border border-line-strong bg-surface-raised px-3 py-2 text-caption font-bold text-ink"
          >
            GOOD QUESTION
          </span>
          <Stack direction="row" align="center" gap="md">
            {/* 보호자 메뉴 화면이 아직 없다 — 자리만 두고 비활성 */}
            <button
              type="button"
              disabled
              title="준비 중이에요"
              className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-body font-semibold text-ink disabled:opacity-60"
            >
              <Icon name="person" className="size-4" />
              보호자 메뉴
            </button>
            <span aria-hidden className="h-4 w-px bg-line-strong" />
            <button
              type="button"
              onClick={() => {
                clearTokens();
                router.replace('/login');
              }}
              className="min-h-touch text-body font-medium text-ink-faint underline"
            >
              로그아웃
            </button>
          </Stack>
        </Stack>
      </Bleed>

      <Stack gap="sm" align="center" className="pt-14 pb-10">
        <h1 className="text-display font-extrabold text-ink">누가 이야기를 시작하나요?</h1>
        <p className="text-bubble text-ink-soft">
          {hasChildren ? '지금 활동할 아이를 선택해 주세요.' : '지금 활동할 아이를 추가해 주세요.'}
        </p>
      </Stack>

      <ul aria-label="아이 목록" className="flex flex-wrap justify-center gap-6">
        {child.list.map((c) => {
          const chosen = c.childId === child.selected?.childId;
          return (
            // 선택 버튼 안에 수정 링크를 넣으면 안 된다(중첩 인터랙티브) — 나란히 둔다
            <li
              key={c.childId}
              className={cn(
                'flex w-44 flex-col items-center gap-1 rounded-card border bg-white px-4 pt-6 pb-4',
                chosen ? 'border-ink' : 'border-line',
              )}
            >
              <button
                type="button"
                onClick={() => child.select(c.childId)}
                aria-pressed={chosen}
                className="flex flex-col items-center gap-1 rounded-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
              >
                <span
                  aria-hidden
                  className="mb-2 flex size-[72px] items-center justify-center rounded-full bg-surface-raised text-ink-faint"
                >
                  <Icon name="smile" className="size-8" />
                </span>
                <span className="text-bubble font-bold text-ink">{c.name}</span>
                <span className="text-caption text-ink-faint">{c.age}세</span>
              </button>
              <Link
                href={`/children/${c.childId}/edit`}
                aria-label={`${c.name} 정보 수정`}
                className="mt-2 rounded-[4px] border border-line-strong bg-surface-raised px-2 py-0.5 text-[12px] text-ink-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
              >
                수정
              </Link>
            </li>
          );
        })}

        {/* 시안: 아이가 없으면 점선 슬롯 3개, 있으면 남는 자리 하나만 점선이다 */}
        {Array.from({ length: hasChildren ? 1 : 3 }).map((_, i) => (
          <li key={`slot-${i}`} className="flex w-44">
            {i === 0 ? (
              <Link
                href="/children/new"
                className="flex min-h-[216px] w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
              >
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
                >
                  <Icon name="plus" className="size-6" />
                </span>
                <span className="text-body font-semibold text-ink-soft">아이 추가</span>
              </Link>
            ) : (
              <div
                aria-hidden
                className="min-h-[216px] w-full rounded-card border border-dashed border-line-strong"
              />
            )}
          </li>
        ))}
      </ul>

      {/* 하단 고정 줄 — 시안은 구분선 아래 가운데에 CTA 하나 */}
      <Bleed className="mt-auto border-t border-line pt-5 pb-2">
        <Stack align="center">
          <TouchTarget
            size="lg"
            disabled={child.selected === undefined}
            onClick={() => {
              if (child.selected) {
                child.select(child.selected.childId);
                router.push('/home');
              }
            }}
            className="w-full max-w-sm"
          >
            이 아이로 시작하기
          </TouchTarget>
        </Stack>
      </Bleed>
    </Screen>
  );
}
