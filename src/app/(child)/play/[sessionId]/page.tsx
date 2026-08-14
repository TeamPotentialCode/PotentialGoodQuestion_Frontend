'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { PlayHeader } from '@/features/play/play-header';
import { PlayNarration } from '@/features/play/play-narration';
import { PlayStage } from '@/features/play/play-stage';
import { hasUserGesture } from '@/features/play/useAudioOwnership';
import { usePlaySession } from '@/features/play/usePlaySession';
import { dialogueClosingImage } from '@/features/story/images';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PlayPage() {
  const authenticated = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  const play = usePlaySession(authenticated ? sessionId : Number.NaN);
  const { state, dispatch, scene, narrationPage, characterLine, session } = play;

  // 마지막 장면까지 끝나면 말하기 후 활동으로 넘어간다
  const finished = state.phase.tag === 'sceneComplete' && state.phase.postActivity;
  useEffect(() => {
    if (finished) router.replace(`/sessions/${sessionId}/post/order`);
  }, [finished, router, sessionId]);

  /*
   * 새로고침·주소 직접 입력으로 들어오면 이 문서에 제스처가 없어 소리를 못 튼다.
   * 별도 잠금 화면을 두는 대신 이야기 상세로 돌려보낸다 —
   * 거기서 "이어서 하기"를 누르는 탭이 제스처가 되어 소리까지 살아난다.
   * (제스처가 있으면 usePlaySession 이 잠금을 곧장 풀어 이 조건에 안 걸린다)
   */
  const needsGesture = state.phase.tag === 'locked' && session.data !== undefined && !hasUserGesture();
  const storyId = session.data?.storyId;
  useEffect(() => {
    if (needsGesture && storyId !== undefined) router.replace(`/stories/${storyId}`);
  }, [needsGesture, storyId, router]);

  // locked 는 화면이 아니다 — 자동 해제 또는 상세 리다이렉트가 끝날 때까지 로딩만 보여준다
  if (!authenticated || session.isPending || state.phase.tag === 'locked') {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  if (session.isError || !session.data) {
    return (
      <Screen scrollable className="py-10">
        <Stack gap="lg" className="mx-auto w-full max-w-lg">
          <p role="alert" className="text-body text-ink">
            세션을 불러오지 못했어요.
          </p>
          <Link href="/home">
            <TouchTarget look="outline">홈으로</TouchTarget>
          </Link>
        </Stack>
      </Screen>
    );
  }

  return (
    // 상태 전이를 E2E 에서 단언하려고 phase tag 를 노출한다.
    // 캐릭터 대사는 LLM 이 생성해 매번 달라지므로 텍스트로 단언하지 않는다
    <Screen
      scrollable
      className="py-4"
      data-testid="play-stage"
      data-state={state.phase.tag}
      // 내레이션 몇 번째 장인지 — E2E 가 "다음"이 실제로 먹혔는지 기다리는 데 쓴다
      data-narration={narrationPage ? String(narrationPage.narrationIndex) : ''}
    >
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <PlayHeader
          storyTitle={session.data.storyTitle}
          dialogueIndex={scene?.dialogueIndex ?? null}
          dialogueTotal={scene?.dialogueTotal ?? null}
          badge={
            narrationPage ? `시작 (${narrationPage.narrationIndex}/${scene?.narrationTotal})` : null
          }
        />

        {/*
         * 콘텐츠 문서: 대화3 마무리 대사 뒤에는 "방귀로 배가 떨어지는 결과 연출"이 이어진다.
         * DB 에 별도 장면이 없어, 마무리 대사~장면 완료 동안 왼쪽 컷을 연출 이미지로 바꾼다
         */}
        {narrationPage ? (
          <PlayNarration
            page={narrationPage}
            total={scene?.narrationTotal ?? 0}
            onReplay={play.replayNarration}
            onNext={play.advanceNarration}
          />
        ) : (
          <PlayStage
            phase={state.phase}
            characterName={scene?.characterName ?? ''}
            sceneDescription={scene?.sceneDescription ?? ''}
            dialogueIndex={scene?.dialogueIndex ?? null}
            imageUrl={
              ((state.phase.tag === 'speaking' && state.phase.kind === 'closing') ||
              state.phase.tag === 'sceneComplete'
                ? dialogueClosingImage(scene?.dialogueIndex ?? 0)
                : null) ?? scene?.imageUrl ?? null
            }
            characterLine={characterLine}
            transcript={state.transcript?.text ?? null}
            micLevel={play.micLevel}
            turnLog={play.turnLog}
            onAction={dispatch}
            onReplayScene={play.replaySceneDescription}
            onReplayLine={play.replayCharacterLine}
          />
        )}
      </Stack>
    </Screen>
  );
}
