'use client';

import type { ReactNode } from 'react';
import { MISSION_COPY, type Phase, type PlayEvent } from '@/core/play-session/types';
import { PlayControls } from '@/features/play/play-controls';
import { SceneColumn } from '@/features/play/scene-column';
import { missionImage } from '@/features/story/images';
import {
  Character,
  cn,
  Icon,
  ImageSlot,
  MicLevel,
  SpeechBubble,
  Stack,
  TouchTarget,
  TwoPane,
} from '@/shared/ui';

interface PlayStageProps {
  phase: Phase;
  characterName: string;
  childName: string;
  /** 단어 담기용 — 이 세션에 물린 아이 */
  childId: number | null;
  sceneDescription: string;
  /** 장면 이미지 자리에 표시할 번호. 아직 못 불러왔으면 null */
  dialogueIndex: number | null;
  imageUrl: string | null;
  characterLine: string;
  /** reviewing 단계에서 아이 말풍선으로 보여줄 텍스트 */
  transcript: string | null;
  /** 녹음 중 마이크 입력 크기 (0~1) */
  micLevel: number;
  onAction: (event: PlayEvent) => void;
  onReplayScene: () => void;
  onReplayLine: () => void;
}

function characterState(phase: Phase): 'idle' | 'speaking' | 'thinking' {
  if (phase.tag === 'speaking' || phase.tag === 'narrating') return 'speaking';
  if (phase.tag === 'analyzing') return 'thinking';
  return 'idle';
}

// 시안(v6): 좌측은 장면 이미지 + 낭독 패널, 우측은 캐릭터·말풍선, 맨 아래 상호작용 패널
export function PlayStage({
  phase,
  characterName,
  childName,
  childId,
  sceneDescription,
  dialogueIndex,
  imageUrl,
  characterLine,
  transcript,
  micLevel,
  onAction,
  onReplayScene,
  onReplayLine,
}: PlayStageProps) {
  // analyzing 은 캐릭터 카드 안에 아바타를 다시 그린다 — 위쪽 아바타는 자리만 차지한다
  const showTopCharacter = phase.tag !== 'analyzing';
  const showTranscript =
    transcript && (phase.tag === 'analyzing' || phase.tag === 'reviewing');

  return (
    <TwoPane
      rightFill
      left={
        <SceneColumn
          imageUrl={imageUrl}
          imageLabel={dialogueIndex ? `장면 ${dialogueIndex} 이미지` : '장면 이미지'}
          text={sceneDescription}
          onReplay={onReplayScene}
          replayLabel="장면 설명 다시 듣기"
          childId={childId}
        />
      }
      right={
        <div className="flex h-full w-full flex-col gap-4">
          {showTopCharacter && (
            <Character
              name={characterName || '캐릭터'}
              state={characterState(phase)}
              size="sm"
              shape="card"
              showName
              className="self-center"
            />
          )}

          {characterLine && phase.tag !== 'analyzing' && (
            <div className="flex w-full items-start gap-3">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-faint"
              >
                <Icon name="person" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="text-caption text-ink-faint">{characterName || '캐릭터'}</p>
                <SpeechBubble
                  speaker="character"
                  className="w-full max-w-none"
                  footer={
                    <ReplayButton onClick={onReplayLine} label="캐릭터 대사 다시 듣기" inline />
                  }
                >
                  “{characterLine}”
                </SpeechBubble>
              </div>
            </div>
          )}

          {showTranscript && (
            <div className="flex w-full flex-col items-end gap-1 pl-14">
              <p className="text-caption text-ink-faint">{childName || '나'} (나)</p>
              <SpeechBubble speaker="child" className="w-full max-w-none">
                “{transcript}”
              </SpeechBubble>
            </div>
          )}

          {/* 아래부터는 바닥에 붙는 상호작용 영역 (v6) */}
          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
            {phase.tag === 'speaking' && (
              <StatusCard>
                <p className="text-body text-ink-soft" aria-live="polite">
                  {phase.kind === 'closing'
                    ? '장면을 마무리하고 있어요'
                    : `${characterName || '캐릭터'} 가 말하는 중`}
                </p>
                <Icon name="wave" className="size-6 text-ink-faint" />
              </StatusCard>
            )}

            {phase.tag === 'awaitingChild' && (
              <StatusCard title="이제 네 차례야!" hint="편하게 네 생각을 말해 줘.">
                <PlayControls phase={phase} onAction={onAction} />
                <p className="text-caption text-ink-soft">곧 네 목소리를 들을게</p>
              </StatusCard>
            )}

            {phase.tag === 'recording' && (
              <StatusCard title="듣고 있어요!" hint="편하게 이야기해 줘.">
                <span
                  aria-hidden
                  className="flex size-16 items-center justify-center rounded-full border border-line-strong bg-white text-ink ring-4 ring-line"
                >
                  <Icon name="mic" className="size-7" />
                </span>
                {/* 소리가 실제로 들어오는지 눈으로 보이게 한다. 정보는 위 글자가 이미 전달한다 */}
                <MicLevel level={micLevel} />
                <p className="text-caption text-ink-soft">네 목소리를 듣고 있어요</p>
                <PlayControls phase={phase} onAction={onAction} />
              </StatusCard>
            )}

            {phase.tag === 'transcribing' && (
              <StatusCard title="내가 한 말을 글자로 바꾸고 있어요" hint="조금만 기다려 줘!">
                <WaitingDots />
              </StatusCard>
            )}

            {/*
             * 실백엔드 LLM 응답이 평균 19초, 최대 38초 걸림 조치 필요
             * 점 3개만 움직이면 아이는 고장 난 줄 안다 — 무슨 일이 일어나는지 글자로 알려준다
             */}
            {phase.tag === 'analyzing' && (
              <StatusCard
                title={`${characterName || '캐릭터'}가 생각하고 있어요`}
                hint="조금만 기다려 줘!"
                header={
                  <Character
                    name={characterName || '캐릭터'}
                    state="thinking"
                    size="sm"
                    shape="card"
                    showName
                  />
                }
              >
                <WaitingDots />
              </StatusCard>
            )}

            {/*
             * 미션 안내 — 결과를 제출하는 API 는 없다. 아이가 읽고 **말로 답하면**
             * 그 발화가 utterances 로 흘러가 캐릭터 대화에 반영된다(MVP 문서 §4)
             */}
            {phase.tag === 'mission' && (
              <StatusCard
                title={MISSION_COPY[phase.missionType].title}
                hint={MISSION_COPY[phase.missionType].body}
                header={
                  <ImageSlot
                    src={missionImage(phase.missionType)}
                    label="미션 그림"
                    size="bare"
                    className="h-40 w-full max-w-96 rounded-control"
                  />
                }
              >
                <p className="text-caption text-ink-soft">
                  준비되면 아래를 눌러 줘. 네 차례가 시작돼!
                </p>
                <PlayControls phase={phase} onAction={onAction} />
              </StatusCard>
            )}

            {(phase.tag === 'error' || phase.tag === 'fatal') && (
              <StatusCard title="잠깐 문제가 생겼어요" hint="다시 한번 해 볼까?" tone="alert">
                <p role="alert" className="text-caption text-ink-soft">
                  {phase.message}
                </p>
                <PlayControls phase={phase} onAction={onAction} />
              </StatusCard>
            )}

            {/* 위 패널들에 안 담긴 단계의 버튼 (reviewing 의 다시 말하기/보내기, sceneComplete 의 다음 장면으로) */}
            {(phase.tag === 'reviewing' || phase.tag === 'sceneComplete') && (
              <PlayControls
                phase={phase}
                onAction={onAction}
                className={phase.tag === 'reviewing' ? 'w-full justify-end' : 'w-full'}
                fillButtons={phase.tag === 'sceneComplete'}
              />
            )}
          </div>
        </div>
      }
    />
  );
}

/**
 * 시안이 상태마다 쓰는 카드 한 종류 — 제목 한 줄, 보조 문구 한 줄, 그 아래 자유 영역.
 * 문구가 다를 뿐 모양이 같아서 하나로 묶는다.
 */
function StatusCard({
  title,
  hint,
  tone = 'plain',
  header,
  children,
}: {
  title?: string;
  hint?: string;
  tone?: 'plain' | 'alert';
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="w-full rounded-cta bg-surface-raised px-6 py-6 text-center">
      <Stack gap="sm" align="center">
        {header}
        {tone === 'alert' && (
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-white text-ink-soft"
          >
            <Icon name="refresh" className="size-6" />
          </span>
        )}
        {title && (
          <p className="text-display font-extrabold text-ink" aria-live="polite">
            {title}
          </p>
        )}
        {hint && <p className="text-bubble text-ink-soft">{hint}</p>}
        {children}
      </Stack>
    </div>
  );
}

function WaitingDots() {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      {['0ms', '150ms', '300ms'].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-bounce rounded-full bg-ink-soft"
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
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
