'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { PlayHeader } from '@/features/play/play-header';
import { PlayStage } from '@/features/play/play-stage';
import { usePlaySession } from '@/features/play/usePlaySession';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PlayPage() {
  const authenticated = useRequireAuth();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  const play = usePlaySession(authenticated ? sessionId : Number.NaN);
  const { state, dispatch, scene, characterLine, session } = play;

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
    <Screen scrollable className="py-4" data-testid="play-stage" data-state={state.phase.tag}>
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <PlayHeader
          storyTitle={session.data.storyTitle}
          dialogueIndex={scene?.dialogueIndex ?? null}
          dialogueTotal={scene?.dialogueTotal ?? null}
        />

        <PlayStage
          phase={state.phase}
          characterName={scene?.characterName ?? ''}
          sceneDescription={scene?.sceneDescription ?? ''}
          dialogueIndex={scene?.dialogueIndex ?? null}
          imageUrl={scene?.imageUrl ?? null}
          characterLine={characterLine}
          transcript={state.transcript?.text ?? null}
          onAction={dispatch}
          onReplayScene={play.replaySceneDescription}
          onReplayLine={play.replayCharacterLine}
        />
      </Stack>
    </Screen>
  );
}
