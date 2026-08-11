'use client';

import type { Phase, PlayEvent } from '@/core/play-session/types';
import { PlayControls } from '@/features/play/play-controls';
import {
  Character,
  cn,
  Icon,
  ImageSlot,
  SpeechBubble,
  Stack,
  TouchTarget,
  TwoPane,
} from '@/shared/ui';

interface PlayStageProps {
  phase: Phase;
  characterName: string;
  sceneDescription: string;
  /** 장면 이미지 자리에 표시할 번호. 아직 못 불러왔으면 null */
  dialogueIndex: number | null;
  imageUrl: string | null;
  characterLine: string;
  /** reviewing 단계에서 "이렇게 말했나요?" 로 보여줄 텍스트 */
  transcript: string | null;
  onAction: (event: PlayEvent) => void;
  onReplayScene: () => void;
  onReplayLine: () => void;
}

function characterState(phase: Phase): 'idle' | 'speaking' | 'thinking' {
  if (phase.tag === 'speaking' || phase.tag === 'narrating') return 'speaking';
  if (phase.tag === 'analyzing') return 'thinking';
  return 'idle';
}

// 시안: 좌측은 장면 이미지 + 장면 설명, 우측은 캐릭터와 아이 차례
export function PlayStage({
  phase,
  characterName,
  sceneDescription,
  dialogueIndex,
  imageUrl,
  characterLine,
  transcript,
  onAction,
  onReplayScene,
  onReplayLine,
}: PlayStageProps) {
  return (
    <TwoPane
      left={
        <Stack gap="md">
          <ImageSlot
            src={imageUrl}
            label={dialogueIndex ? `장면 ${dialogueIndex} 이미지` : '장면 이미지'}
          />

          {sceneDescription && (
            <div className="rounded-card bg-surface-raised px-5 py-4">
              <p className="flex items-start gap-3 text-body text-ink">
                <Icon name="wave" className="mt-1" />
                <span>{sceneDescription}</span>
              </p>
              <ReplayButton onClick={onReplayScene} label="장면 설명 다시 듣기" />
            </div>
          )}
        </Stack>
      }
      right={
        <Stack gap="md" align="center">
          <Character
            name={characterName || '캐릭터'}
            state={characterState(phase)}
            size="sm"
            shape="circle"
            showName
          />

          {characterLine && (
            <SpeechBubble
              speaker="character"
              className="w-full max-w-none"
              footer={
                <>
                  <span className="text-caption text-ink-soft">* ㅇㅇ = 아이 이름</span>
                  <ReplayButton onClick={onReplayLine} label="캐릭터 대사 다시 듣기" inline />
                </>
              }
            >
              “{characterLine}”
            </SpeechBubble>
          )}

          {phase.tag === 'awaitingChild' && (
            <div className="w-full rounded-card bg-surface-raised px-5 py-4 text-center">
              <p className="text-title font-semibold text-ink">이제 네 생각을 들려줘!</p>
              <p className="text-caption text-ink-soft">마이크를 누르고 편하게 말해 봐.</p>
            </div>
          )}

          {phase.tag === 'recording' && (
            <p className="text-body text-ink-soft" aria-live="polite">
              듣고 있어요…
            </p>
          )}

          {phase.tag === 'transcribing' && (
            <SpeechBubble speaker="child" pending className="w-full max-w-none" />
          )}

          {phase.tag === 'reviewing' && transcript && (
            <Stack gap="sm" className="w-full">
              <p className="text-caption text-ink-soft">이렇게 말했나요?</p>
              <SpeechBubble speaker="child" className="w-full max-w-none">
                {transcript}
              </SpeechBubble>
            </Stack>
          )}

          {(phase.tag === 'error' || phase.tag === 'fatal') && (
            <p role="alert" className="text-body text-ink">
              {phase.message}
            </p>
          )}

          {phase.tag === 'sceneComplete' && (
            <p className="text-body text-ink">이 장면이 끝났어요.</p>
          )}

          <Stack gap="sm" align="center">
            <PlayControls phase={phase} onAction={onAction} />
            {phase.tag === 'awaitingChild' && (
              <span className="text-caption text-ink-soft">눌러서 말하기</span>
            )}
          </Stack>
        </Stack>
      }
    />
  );
}

function ReplayButton({
  onClick,
  label,
  inline = false,
}: {
  onClick: () => void;
  label: string;
  inline?: boolean;
}) {
  return (
    <TouchTarget
      size="sm"
      look="ghost"
      aria-label={label}
      onClick={onClick}
      className={cn('text-ink-soft', inline && 'underline')}
    >
      <Icon name="speaker" className="size-4" />
      다시 듣기
    </TouchTarget>
  );
}
