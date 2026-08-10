'use client';

import type { Phase, PlayEvent } from '@/core/play-session/types';
import { availableActions } from '@/core/play-session/selectors';
import { Stack, TouchTarget } from '@/shared/ui';

interface PlayControlsProps {
  phase: Phase;
  onAction: (event: PlayEvent) => void;
}

// 어떤 버튼을 보여줄지는 상태 머신이 정한다(availableActions).
// 화면은 그 목록을 버튼으로 옮기기만 한다 — 어느 phase 에서도 2개를 넘지 않는다
export function PlayControls({ phase, onAction }: PlayControlsProps) {
  const actions = availableActions(phase);
  if (actions.length === 0) return null;

  return (
    <Stack direction="row" gap="md" align="center" justify="center">
      {actions.map((type) => {
        switch (type) {
          case 'TAP_UNLOCK':
            return (
              <TouchTarget key={type} size="lg" onClick={() => onAction({ type })}>
                이야기 시작하기
              </TouchTarget>
            );
          case 'TAP_SPEAK':
            return (
              <TouchTarget
                key={type}
                size="record"
                aria-label="말하기"
                onClick={() => onAction({ type })}
              >
                🎤
              </TouchTarget>
            );
          case 'TAP_SEND':
            return (
              <TouchTarget key={type} size="lg" onClick={() => onAction({ type })}>
                보내기
              </TouchTarget>
            );
          case 'TAP_RERECORD':
            return (
              <TouchTarget key={type} size="lg" look="outline" onClick={() => onAction({ type })}>
                다시 말하기
              </TouchTarget>
            );
          case 'TAP_RETRY':
            return (
              <TouchTarget key={type} size="lg" onClick={() => onAction({ type })}>
                다시 시도
              </TouchTarget>
            );
          default:
            return null;
        }
      })}
    </Stack>
  );
}
