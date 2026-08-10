'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type { Child } from '@/core/api/types';
import { getChildren } from '@/features/child-profile/api';

interface SelectedChild {
  query: UseQueryResult<Child[]>;
  list: Child[];
  /** 선택된 아이. 목록이 비었으면 undefined */
  selected: Child | undefined;
  select: (childId: number) => void;
}

/**
 * 아이 목록을 불러오고 하나를 선택한 상태로 들고 있는다.
 * 기본값은 첫 아이이며, 선택은 화면 상태로만 유지한다(새로고침하면 첫 아이로 돌아간다).
 * 홈과 이야기 상세가 같은 규칙을 쓰도록 공용으로 둔다.
 */
export function useSelectedChild(enabled: boolean): SelectedChild {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
    enabled,
  });

  const list = query.data ?? [];
  const selected = list.find((child) => child.childId === selectedChildId) ?? list[0];

  return { query, list, selected, select: setSelectedChildId };
}
