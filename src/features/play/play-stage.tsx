'use client';

import type { Phase } from '@/core/play-session/types';
import type { PlayLine } from '@/features/play/usePlaySession';
import { Character, SpeechBubble, Stack } from '@/shared/ui';

interface PlayStageProps {
  phase: Phase;
  characterName: string;
  lines: PlayLine[];
  /** reviewing 단계에서 "이렇게 말했나요?" 로 보여줄 텍스트 */
  transcript: string | null;
}

// 진행 표시의 위치를 phase 마다 달리 둔다(계획서 §7):
//   analyzing → 캐릭터 위, transcribing → 아이 말풍선 안, recording → 하단
function characterState(phase: Phase): 'idle' | 'speaking' | 'thinking' {
  if (phase.tag === 'speaking' || phase.tag === 'narrating') return 'speaking';
  if (phase.tag === 'analyzing') return 'thinking';
  return 'idle';
}

export function PlayStage({ phase, characterName, lines, transcript }: PlayStageProps) {
  return (
    <Stack gap="lg">
      <Stack align="center">
        <Character name={characterName || '캐릭터'} state={characterState(phase)} size="lg" />
      </Stack>

      <Stack gap="sm">
        {lines.map((line) => (
          <SpeechBubble key={line.id} speaker={line.speaker}>
            {line.text}
          </SpeechBubble>
        ))}

        {phase.tag === 'transcribing' && <SpeechBubble speaker="child" pending />}

        {phase.tag === 'reviewing' && transcript && (
          <Stack gap="sm" align="stretch">
            <p className="text-caption text-ink-soft">이렇게 말했나요?</p>
            <SpeechBubble speaker="child">{transcript}</SpeechBubble>
          </Stack>
        )}
      </Stack>

      {phase.tag === 'recording' && (
        <p className="text-body text-ink-soft" aria-live="polite">
          듣고 있어요…
        </p>
      )}

      {phase.tag === 'error' && (
        <p role="alert" className="text-body text-ink">
          {phase.message}
        </p>
      )}

      {phase.tag === 'fatal' && (
        <p role="alert" className="text-body text-ink">
          {phase.message}
        </p>
      )}
    </Stack>
  );
}
