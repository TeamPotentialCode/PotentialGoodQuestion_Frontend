'use client';

import type { Child } from '@/core/api/types';
import { ChildChip } from '@/features/child-profile/child-chip';
import { Bleed, Icon, Stack } from '@/shared/ui';

interface AppHeaderProps {
  list: Child[];
  selected: Child | undefined;
  onSelect: (childId: number) => void;
  /** 주면 로고 자리에 화면 이름이 온다 (시안: 이야기·단어장·마이페이지) */
  title?: string;
  /** 제목 앞 아이콘 */
  icon?: 'book' | 'bookmark';
}

/**
 * 상단 바 — 로고 자리(또는 화면 이름) + 아이 칩(이름 ▾).
 *
 * 시안에서 아이 전환·계정 관리가 본문에서 여기로 올라왔다.
 * 백엔드가 아이를 한 명만 허용하지만(MAX_CHILDREN), 화면은 여러 명을 다룰 수 있게 둔다.
 */
export function AppHeader({ list, selected, onSelect, title, icon }: AppHeaderProps) {
  return (
    // 구분선은 화면 끝까지, 헤더는 화면 맨 위까지 (v6)
    <Bleed top className="border-b border-line">
      <Stack direction="row" align="center" justify="between" gap="md" className="py-2">
        {title ? (
          <h1 className="flex items-center gap-2 text-display font-extrabold text-ink">
            {icon && <Icon name={icon} className="size-6" />}
            {title}
          </h1>
        ) : (
          <span
            aria-hidden
            className="rounded-control border border-dashed border-line-strong bg-surface-raised px-3 py-1.5 text-caption font-semibold text-ink-soft"
          >
            [GQ 로고]
          </span>
        )}

        <ChildChip list={list} selected={selected} onSelect={onSelect} />
      </Stack>
    </Bleed>
  );
}
