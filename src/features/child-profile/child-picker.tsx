'use client';

import type { Child } from '@/core/api/types';
import { Stack, TouchTarget } from '@/shared/ui';

interface ChildPickerProps {
  list: Child[];
  selected: Child | undefined;
  onSelect: (childId: number) => void;
}

/** 아이가 2명 이상일 때만 선택 버튼을 보여준다. 1명이면 이름만 표시한다. */
export function ChildPicker({ list, selected, onSelect }: ChildPickerProps) {
  if (list.length <= 1) {
    return selected ? (
      <p className="text-body text-ink">
        {selected.name} · 만 {selected.age}세
      </p>
    ) : null;
  }

  return (
    <Stack direction="row" gap="sm" className="flex-wrap">
      {list.map((child) => (
        <TouchTarget
          key={child.childId}
          look={child.childId === selected?.childId ? 'solid' : 'outline'}
          aria-pressed={child.childId === selected?.childId}
          onClick={() => onSelect(child.childId)}
        >
          {child.name}
        </TouchTarget>
      ))}
    </Stack>
  );
}
