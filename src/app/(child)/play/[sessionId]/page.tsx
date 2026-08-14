'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { PlayHeader } from '@/features/play/play-header';
import { PlayNarration } from '@/features/play/play-narration';
import { PlayStage } from '@/features/play/play-stage';
import { usePlaySession } from '@/features/play/usePlaySession';
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

  if (!authenticated || session.isPending) {
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

        {narrationPage ? (
          <PlayNarration
            page={narrationPage}
            total={scene?.narrationTotal ?? 0}
            onReplay={play.replayNarration}
            onNext={() => dispatch({ type: 'TAP_NEXT' })}
          />
        ) : (
          <PlayStage
            phase={state.phase}
            characterName={scene?.characterName ?? ''}
            sceneDescription={scene?.sceneDescription ?? ''}
            dialogueIndex={scene?.dialogueIndex ?? null}
            imageUrl={scene?.imageUrl ?? null}
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
