'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import type { Child } from '@/core/api/types';
import { getChildren } from '@/features/child-profile/api';

interface SelectedChild {
  query: UseQueryResult<Child[]>;
  list: Child[];
  /** 선택된 아이. 목록이 비었으면 undefined */
  selected: Child | undefined;
  select: (childId: number) => void;
}

/*
 * 어느 아이로 활동 중인지는 화면을 옮겨도 유지돼야 한다.
 * 아이 선택(CHILD-01)에서 고른 아이를 홈·이야기가 그대로 써야 하기 때문이다.
 * 계정이 바뀌면 Providers 가 sessionStorage 를 비우므로 앞 계정의 선택이 남지 않는다.
 */
const KEY = 'gq.selectedChild';
const listeners = new Set<() => void>();

function readSelectedId(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function selectChild(childId: number): void {
  try {
    sessionStorage.setItem(KEY, String(childId));
  } catch {
    // 저장이 막혀 있으면 이번 화면에서만 유효하다
  }
  for (const l of listeners) l();
}

export function useSelectedChild(enabled: boolean): SelectedChild {
  // 서버에서는 sessionStorage 를 못 읽는다 — null 로 두면 첫 아이로 떨어진다
  const selectedId = useSyncExternalStore(subscribe, readSelectedId, () => null);

  const query = useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
    enabled,
  });

  const list = query.data ?? [];
  const selected = list.find((child) => String(child.childId) === selectedId) ?? list[0];

  const select = useCallback((childId: number) => selectChild(childId), []);

  return { query, list, selected, select };
}
