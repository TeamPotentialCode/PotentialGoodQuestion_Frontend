'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearTokens } from '@/core/api/auth-token';
import type { Child } from '@/core/api/types';
import { Icon, Stack } from '@/shared/ui';

interface AppHeaderProps {
  list: Child[];
  selected: Child | undefined;
  onSelect: (childId: number) => void;
  /** 주면 로고 자리에 화면 이름이 온다 (시안: 단어장·마이페이지) */
  title?: string;
  /** 제목 앞 아이콘 */
  icon?: 'book' | 'bookmark';
}

/**
 * 상단 바 — 로고 자리 + 아이 칩(이름 ▾).
 *
 * 시안에서 아이 전환·계정 관리가 본문에서 여기로 올라왔다.
 * 백엔드가 아이를 한 명만 허용하지만(MAX_CHILDREN), 화면은 여러 명을 다룰 수 있게 둔다.
 */
export function AppHeader({ list, selected, onSelect, title, icon }: AppHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Stack
      direction="row"
      align="center"
      justify="between"
      gap="md"
      className="border-b border-line pb-3"
    >
      {title ? (
        <h1 className="flex items-center gap-2 text-body font-semibold text-ink">
          {icon && <Icon name={icon} className="size-5" />}
          {title}
        </h1>
      ) : (
        <span
          aria-hidden
          className="rounded-card border border-dashed border-line bg-surface-raised px-3 py-1.5 text-caption font-semibold text-ink-soft"
        >
          [GQ 로고]
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex min-h-touch items-center gap-2 rounded-full border border-line bg-surface px-3 text-body text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
        >
          <span aria-hidden className="size-7 rounded-full bg-surface-raised" />
          {selected?.name ?? '아이 선택'}
          <Icon name="chevron-down" className="size-5 text-ink-soft" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-56 rounded-card border border-line bg-surface p-2 shadow-sm"
          >
            {list.map((child) => (
              <button
                key={child.childId}
                type="button"
                role="menuitemradio"
                aria-checked={child.childId === selected?.childId}
                onClick={() => {
                  onSelect(child.childId);
                  setOpen(false);
                }}
                className="flex min-h-touch w-full items-center justify-between rounded-card px-3 text-body text-ink hover:bg-surface-raised"
              >
                {child.name} · 만 {child.age}세
                {child.childId === selected?.childId && <Icon name="check" className="size-5" />}
              </button>
            ))}

            <Link
              href="/children"
              className="flex min-h-touch items-center rounded-card px-3 text-body text-ink hover:bg-surface-raised"
            >
              아이 관리
            </Link>
            <button
              type="button"
              onClick={() => {
                clearTokens();
                router.replace('/login');
              }}
              className="flex min-h-touch w-full items-center rounded-card px-3 text-body text-ink-soft hover:bg-surface-raised"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </Stack>
  );
}
