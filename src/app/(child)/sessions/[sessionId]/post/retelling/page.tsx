'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { startActivity, submitActivity } from '@/features/activity/api';
import { ActivityHeader } from '@/features/activity/activity-header';
import { activityErrorMessage } from '@/features/activity/error-message';
import {
  handoffUnknownOnServer,
  readHandoff,
  subscribeToHandoff,
} from '@/features/activity/handoff';
import { useRequireAuth } from '@/features/auth/use-session';
import { getSession } from '@/features/story/api';
import { activityCardImage } from '@/features/story/images';
import { transcribe } from '@/features/play/api';
import { useAudioOwnership } from '@/features/play/useAudioOwnership';
import {
  MIC_NO_DEVICE_COPY,
  MIC_PERMISSION_COPY,
  MIC_UNKNOWN_COPY,
  STT_RETRY_COPY,
  STT_SILENT_COPY,
} from '@/core/play-session/types';
import { useMicLevel } from '@/features/play/use-mic-level';
import { CardRow, Icon, MicLevel, Screen, Stack, TouchTarget, TwoPane } from '@/shared/ui';

/**
 * 한 번 말하고 끝나는 화면이라 대화 화면의 상태 머신(core)을 쓰지 않는다.
 * 로컬 state 로 충분하다
 */
type Step = 'idle' | 'recording' | 'transcribing' | 'reviewing' | 'submitting';

export default function PostRetellingPage() {
  const authenticated = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);
  const audio = useAudioOwnership();

  const [step, setStep] = useState<Step>('idle');
  const [said, setSaid] = useState('');
  // 실패 문구. 대화 화면과 같은 상수를 써서 두 화면의 안내가 어긋나지 않게 한다
  const [failure, setFailure] = useState<string | null>(null);

  // 순서 맞추기에서 넘어온 정답 순서와 핵심 단어.
  // 서버에서는 sessionStorage 를 못 읽으므로 undefined("아직 모름")로 시작한다 —
  // null("없음")과 구분하지 않으면 하이드레이션 직후 한 프레임 동안 순서 화면으로 튕긴다
  const snapshot = useCallback(() => readHandoff(sessionId), [sessionId]);
  const handoff = useSyncExternalStore(subscribeToHandoff, snapshot, handoffUnknownOnServer);

  useEffect(() => () => audio.releaseAll(), [audio]);

  const activity = useQuery({
    queryKey: ['activity', sessionId],
    queryFn: () => startActivity(sessionId),
    enabled: authenticated && Number.isFinite(sessionId),
    staleTime: Infinity,
  });

  // 카드 삽화용 storyId — 대화·순서 화면과 같은 캐시를 쓴다
  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: authenticated && Number.isFinite(sessionId),
  });
  const storyId = session.data?.storyId ?? null;

  const submit = useMutation({
    mutationFn: () =>
      submitActivity(sessionId, {
        submittedOrder: handoff?.submittedOrder ?? [],
        reconstructionText: said,
      }),
    onSuccess: () => router.replace(`/sessions/${sessionId}/complete`),
    onError: () => setStep('reviewing'),
  });

  const micLevel = useMicLevel(step === 'recording', audio.micLevel);

  async function startTalking() {
    setFailure(null);
    setStep('recording');
    try {
      await audio.startMic();
    } catch (error) {
      // 마이크가 안 켜진 것을 "잘 안 들렸어요" 로 안내하면 어른이 뭘 고쳐야 할지 알 수 없다
      const name = error instanceof DOMException ? error.name : '';
      setFailure(
        name === 'NotAllowedError'
          ? MIC_PERMISSION_COPY
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? MIC_NO_DEVICE_COPY
            : MIC_UNKNOWN_COPY,
      );
      setStep('idle');
    }
  }

  async function stopAndTranscribe() {
    setStep('transcribing');
    try {
      const blob = await audio.stopMic();
      if (!blob || blob.size === 0) {
        // 소리가 아예 안 들어온 것과 인식 실패는 조치가 다르다
        setFailure(STT_SILENT_COPY);
        setStep('idle');
        return;
      }
      const result = await transcribe(blob);
      if (!result.text.trim()) {
        setFailure(STT_RETRY_COPY);
        setStep('idle');
        return;
      }
      setSaid(result.text);
      setStep('reviewing');
    } catch {
      setFailure(STT_RETRY_COPY);
      setStep('idle');
    }
  }

  if (!authenticated || activity.isPending || handoff === undefined) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  // 핵심 단어가 없으면 순서 맞추기부터 다시 — 여기서 만들어낼 수 있는 값이 아니다
  if (handoff === null) {
    return (
      <Screen scrollable className="py-10" data-testid="post-retelling">
        <Stack gap="lg" align="center" className="mx-auto w-full max-w-lg">
          <p className="text-body text-ink">먼저 이야기 순서를 맞춰 볼까?</p>
          <Link href={`/sessions/${sessionId}/post/order`}>
            <TouchTarget size="lg">순서 맞추러 가기</TouchTarget>
          </Link>
        </Stack>
      </Screen>
    );
  }

  if (activity.isError || !activity.data) {
    return (
      <Screen scrollable className="py-10">
        <Stack gap="lg" className="mx-auto w-full max-w-lg">
          <p role="alert" className="text-body text-ink">
            {activityErrorMessage(activity.error)}
          </p>
          <Link href="/home">
            <TouchTarget look="outline">홈으로</TouchTarget>
          </Link>
        </Stack>
      </Screen>
    );
  }

  // 아이가 맞힌 정답 순서대로 늘어놓는다
  const cards = handoff.submittedOrder
    .map((id) => activity.data.cards.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  return (
    <Screen scrollable className="py-4" data-testid="post-retelling" data-step={step}>
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <ActivityHeader title="이야기 다시 말하기" step="2 / 2" />

        <Stack gap="sm" align="center">
          <h2 className="text-title font-semibold text-ink">
            이번에는 네가 이야기를 들려줄 차례야!
          </h2>
          <p className="text-caption text-ink-soft">장면과 단어를 보면서 처음부터 이야기해 봐.</p>
        </Stack>

        <TwoPane
          left={
            <Stack gap="md">
              <p className="flex items-center gap-2 text-caption text-ink-soft">
                <Icon name="image" className="size-4" />
                이야기 순서 (1 ~ {cards.length})
              </p>
              <CardRow>
                {cards.map((card, i) => {
                  const image = storyId === null ? null : activityCardImage(storyId, card.id);
                  return (
                    <li
                      key={card.id}
                      className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-3"
                    >
                      {image ? (
                        <span className="w-full overflow-hidden rounded-card bg-surface-raised">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 프로젝트 정적 삽화 */}
                          <img src={image} alt="" className="size-full min-h-20 object-cover" />
                        </span>
                      ) : (
                        <span className="flex w-full items-center justify-center rounded-card bg-surface-raised py-5 text-ink-soft">
                          <Icon name="image" className="size-6" />
                        </span>
                      )}
                      <span className="flex size-6 items-center justify-center rounded-full bg-surface-raised text-caption text-ink">
                        {i + 1}
                      </span>
                    </li>
                  );
                })}
              </CardRow>

              <Stack gap="sm">
                <p className="text-caption text-ink-soft">떠올려 볼 단어</p>
                <div className="flex flex-wrap gap-2">
                  {handoff.retellingKeywords.map((word) => (
                    <span
                      key={word}
                      className="rounded-full bg-surface-raised px-4 py-1.5 text-caption text-ink"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </Stack>
            </Stack>
          }
          right={
            <Stack gap="md" align="center" className="w-full">
              {step === 'idle' && (
                <>
                  <p className="text-caption text-ink-soft">준비되면 마이크를 눌러 이야기해 줘.</p>
                  <TouchTarget size="record" aria-label="말하기" onClick={startTalking}>
                    <Icon name="mic" className="size-9 text-cta-ink" />
                  </TouchTarget>
                  <span className="text-caption text-ink-soft">말하기</span>
                </>
              )}

              {/* 문구는 대화 화면(TALK v3)과 같은 것을 쓴다 — 두 화면이 어긋나면 아이가 헷갈린다 */}
              {step === 'recording' && (
                <div className="w-full rounded-card bg-surface-raised px-5 py-5 text-center">
                  <Stack gap="sm" align="center">
                    <p className="text-title font-semibold text-ink" aria-live="polite">
                      듣고 있어요!
                    </p>
                    <p className="text-caption text-ink-soft">편하게 이야기해 줘.</p>
                    <MicLevel level={micLevel} />
                    <TouchTarget size="lg" onClick={stopAndTranscribe}>
                      보내기
                    </TouchTarget>
                  </Stack>
                </div>
              )}

              {step === 'transcribing' && (
                <div className="w-full rounded-card bg-surface-raised px-5 py-5 text-center">
                  <Stack gap="sm" align="center">
                    <p className="text-title font-semibold text-ink" aria-live="polite">
                      내가 한 말을 글자로 바꾸고 있어요
                    </p>
                    <p className="text-caption text-ink-soft">조금만 기다려 줘!</p>
                  </Stack>
                </div>
              )}

              {/* 시안: 결과 칸은 처음부터 자리를 잡고 있고, 말하기 전에는 안내 문구가 들어 있다 */}
              <Stack gap="sm" className="w-full">
                <p className="text-caption text-ink-soft">내가 이렇게 말했어요</p>
                <p className="min-h-40 w-full rounded-card bg-surface-raised px-5 py-4 text-body">
                  {said ? (
                    <span className="text-ink">{said}</span>
                  ) : (
                    <span className="text-ink-soft">내가 말한 이야기가 여기에 보여요.</span>
                  )}
                </p>
              </Stack>

              {(step === 'reviewing' || step === 'submitting') && (
                <Stack direction="row" gap="md" justify="center">
                  <TouchTarget
                    size="lg"
                    look="outline"
                    onClick={startTalking}
                    disabled={submit.isPending}
                  >
                    다시 말하기
                  </TouchTarget>
                  <TouchTarget
                    size="lg"
                    onClick={() => {
                      setStep('submitting');
                      submit.mutate();
                    }}
                    disabled={submit.isPending}
                  >
                    보내기
                  </TouchTarget>
                </Stack>
              )}

              {failure && (
                <p role="alert" className="text-body text-ink">
                  {failure}
                </p>
              )}
              {submit.isError && (
                <p role="alert" className="text-body text-ink">
                  잠깐 문제가 생겼어요. 다시 보내 볼까요?
                </p>
              )}
            </Stack>
          }
        />
      </Stack>
    </Screen>
  );
}
