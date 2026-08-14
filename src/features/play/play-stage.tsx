'use client';

import type { ReactNode } from 'react';
import type { Phase, PlayEvent } from '@/core/play-session/types';
import { PlayControls } from '@/features/play/play-controls';
import type { TurnLogEntry } from '@/features/play/usePlaySession';
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
  sceneDescription: string;
  /** 장면 이미지 자리에 표시할 번호. 아직 못 불러왔으면 null */
  dialogueIndex: number | null;
  imageUrl: string | null;
  characterLine: string;
  /** reviewing 단계에서 "이렇게 말했나요?" 로 보여줄 텍스트 */
  transcript: string | null;
  /** 녹음 중 마이크 입력 크기 (0~1) */
  micLevel: number;
  /** 시안 우측 하단 "최근 이야기" — 오래된 것부터 */
  turnLog: TurnLogEntry[];
  onAction: (event: PlayEvent) => void;
  onReplayScene: () => void;
  onReplayLine: () => void;
}

function characterState(phase: Phase): 'idle' | 'speaking' | 'thinking' {
  if (phase.tag === 'speaking' || phase.tag === 'narrating') return 'speaking';
  if (phase.tag === 'analyzing') return 'thinking';
  return 'idle';
}

// 시안은 아바타 아래에 지금 무슨 일이 일어나는지 한 줄로 적어 둔다
function characterStatus(phase: Phase, name: string): string | null {
  switch (phase.tag) {
    case 'speaking':
      return phase.kind === 'closing' ? '장면을 마무리하고 있어요' : '말하는 중';
    case 'narrating':
      return '말하는 중';
    case 'sceneComplete':
      return '장면을 마무리하고 있어요';
    case 'analyzing':
      return `${name || '캐릭터'}가 생각하고 있어요`;
    case 'awaitingChild':
    case 'recording':
    case 'transcribing':
    case 'reviewing':
      return '기다리는 중…';
    default:
      return null;
  }
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
  micLevel,
  turnLog,
  onAction,
  onReplayScene,
  onReplayLine,
}: PlayStageProps) {
  // analyzing 은 캐릭터 카드 안에 아바타를 다시 그린다 — 위쪽 아바타는 자리만 차지한다
  const showTopCharacter = phase.tag !== 'analyzing';

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
          {showTopCharacter && (
            <Character
              name={characterName || '캐릭터'}
              state={characterState(phase)}
              status={characterStatus(phase, characterName)}
              size="sm"
              shape="circle"
              showName
            />
          )}

          {characterLine && phase.tag !== 'analyzing' && (
            <SpeechBubble
              speaker="character"
              className="w-full max-w-none"
              footer={<ReplayButton onClick={onReplayLine} label="캐릭터 대사 다시 듣기" inline />}
            >
              “{characterLine}”
            </SpeechBubble>
          )}

          {phase.tag === 'awaitingChild' && (
            <StatusCard title="이제 네 차례야!" hint="편하게 네 생각을 말해 줘.">
              <p className="text-caption text-ink-soft">곧 네 목소리를 들을게</p>
            </StatusCard>
          )}

          {phase.tag === 'recording' && (
            <StatusCard title="듣고 있어요!" hint="편하게 이야기해 줘.">
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full bg-cta text-cta-ink"
              >
                <Icon name="mic" className="size-7" />
              </span>
              {/* 소리가 실제로 들어오는지 눈으로 보이게 한다. 정보는 위 글자가 이미 전달한다 */}
              <MicLevel level={micLevel} />
              <p className="text-caption text-ink-soft">네 목소리를 듣고 있어요</p>
            </StatusCard>
          )}

          {phase.tag === 'transcribing' && (
            <StatusCard title="내가 한 말을 글자로 바꾸고 있어요" hint="조금만 기다려 줘!">
              <WaitingDots />
              <span
                aria-hidden
                className="flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-caption text-ink-soft"
              >
                <Icon name="mic" className="size-4" />→
                <Icon name="book" className="size-4" />
              </span>
              <p className="text-caption tracking-wide text-ink-soft">VOICE → TEXT</p>
            </StatusCard>
          )}

          {/*
           * 실백엔드 LLM 응답이 평균 19초, 최대 38초 걸림 조치 필요
           * 점 3개만 움직이면 아이는 고장 난 줄 안다 — 무슨 일이 일어나는지 글자로 알려준다
           */}
          {phase.tag === 'analyzing' && (
            <Stack gap="sm" className="w-full">
              {transcript && (
                <>
                  <p className="text-caption text-ink-soft">내 대답이에요</p>
                  <SpeechBubble speaker="child" className="w-full max-w-none">
                    {transcript}
                  </SpeechBubble>
                </>
              )}
              <StatusCard
                title={`${characterName || '캐릭터'}가 생각하고 있어요`}
                hint="조금만 기다려 줘!"
                header={
                  <Character
                    name={characterName || '캐릭터'}
                    state="thinking"
                    size="sm"
                    shape="circle"
                    showName
                  />
                }
              >
                <WaitingDots />
              </StatusCard>
            </Stack>
          )}

          {phase.tag === 'reviewing' && transcript && (
            <Stack gap="sm" className="w-full">
              <p className="text-caption text-ink-soft">이렇게 말했나요?</p>
              <SpeechBubble speaker="child" className="w-full max-w-none font-semibold">
                {transcript}
              </SpeechBubble>
            </Stack>
          )}

          {(phase.tag === 'error' || phase.tag === 'fatal') && (
            <StatusCard title="잠깐 문제가 생겼어요" hint="다시 한번 해 볼까?" tone="alert">
              <p role="alert" className="text-caption text-ink-soft">
                {phase.message}
              </p>
            </StatusCard>
          )}

          <Stack gap="sm" align="center">
            <PlayControls phase={phase} onAction={onAction} />
          </Stack>

          <RecentLog entries={turnLog} />
        </Stack>
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
  title: string;
  hint?: string;
  tone?: 'plain' | 'alert';
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="w-full rounded-card bg-surface-raised px-5 py-5 text-center">
      <Stack gap="sm" align="center">
        {header}
        {tone === 'alert' && (
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-surface text-ink-soft"
          >
            <Icon name="refresh" className="size-6" />
          </span>
        )}
        <p className="text-title font-semibold text-ink" aria-live="polite">
          {title}
        </p>
        {hint && <p className="text-caption text-ink-soft">{hint}</p>}
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

/**
 * 시안 우측 하단의 "최근 이야기". 지금 화면에 없는 직전 대사를 아이가 다시 볼 수 있게 한다.
 * 3줄까지만 — 그 위로는 아이가 읽지 않는다
 */
function RecentLog({ entries }: { entries: TurnLogEntry[] }) {
  if (entries.length === 0) return null;
  const shown = entries.slice(-3);

  return (
    <section aria-label="최근 이야기" className="w-full">
      <h2 className="pb-1.5 text-caption text-ink-soft">최근 이야기</h2>
      <Stack gap="sm" className="rounded-card bg-surface-raised px-4 py-3">
        {shown.map((entry, index) => (
          <div key={`${entry.name}-${entries.length - shown.length + index}`}>
            <p className="flex items-baseline justify-between gap-3 text-caption font-semibold text-ink">
              <span>
                {entry.name}
                {index === shown.length - 1 && (
                  <span className="font-normal text-ink-soft"> (현재)</span>
                )}
              </span>
              {index === 0 && <span className="font-normal text-ink-soft">방금 전</span>}
            </p>
            <p className="text-caption text-ink-soft">{entry.text}</p>
          </div>
        ))}
      </Stack>
    </section>
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
