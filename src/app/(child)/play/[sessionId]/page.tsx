'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { PlayControls } from '@/features/play/play-controls';
import { PlayStage } from '@/features/play/play-stage';
import { usePlaySession } from '@/features/play/usePlaySession';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PlayPage() {
  const authenticated = useRequireAuth();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  const play = usePlaySession(authenticated ? sessionId : Number.NaN);
  const { state, dispatch, lines, characterName, session } = play;

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

  const sceneDone = state.phase.tag === 'sceneComplete';

  return (
    // 상태 전이를 E2E 에서 단언하려고 phase tag 를 노출한다.
    // 캐릭터 대사는 LLM 이 생성해 매번 달라지므로 텍스트로 단언하지 않는다
    <Screen scrollable className="py-10" data-testid="play-stage" data-state={state.phase.tag}>
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        <h1 className="text-title font-semibold text-ink">{session.data.storyTitle}</h1>

        <PlayStage
          phase={state.phase}
          characterName={characterName}
          lines={lines}
          transcript={state.transcript?.text ?? null}
        />

        {sceneDone ? (
          // 다음 장면으로 이어가는 건 다음 작업이다
          <p className="text-body text-ink">이 장면이 끝났어요.</p>
        ) : (
          <PlayControls phase={state.phase} onAction={dispatch} />
        )}

        {/* 진행 중에도 언제든 빠져나갈 수 있어야 한다 */}
        <Link href="/home">
          <TouchTarget look="outline" className="w-full">
            홈으로
          </TouchTarget>
        </Link>
      </Stack>
    </Screen>
  );
}
