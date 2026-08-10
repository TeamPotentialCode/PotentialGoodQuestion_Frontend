'use client';

import { useReducer } from 'react';
import { transition } from '@/core/play-session/transition';
import { INITIAL_STATE, type PlayEvent, type PlayState } from '@/core/play-session/types';

/**
 * 대화 화면의 상태 보관소.
 *
 * `transition` 이 이미 순수 리듀서라 useReducer 로 그대로 쓴다 — 별도 스토어 계층이 없다.
 * 오디오 콜백도 같은 훅 스코프에서 dispatch 에 접근하므로 전역 스토어가 필요하지 않다.
 */
export function usePlayStore(): [PlayState, (event: PlayEvent) => void] {
  return useReducer(transition, INITIAL_STATE);
}
