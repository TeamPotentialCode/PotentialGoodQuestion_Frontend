'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { Phase } from '@/core/play-session/types';
import { submitUtterance, synthesize, transcribe } from '@/features/play/api';
import { loadScene } from '@/features/play/scene-source';
import { useAudioOwnership } from '@/features/play/useAudioOwnership';
import { usePlayStore } from '@/features/play/usePlayStore';
import { getSession } from '@/features/story/api';

export interface PlayLine {
  id: number;
  speaker: 'character' | 'child';
  text: string;
}

/**
 * 대화 화면의 두뇌. 상태 머신·오디오·API 를 한곳에서 잇는다.
 *
 * 진행형 phase(loading/speaking/recording/transcribing/analyzing)를 보고 부수효과를 실행한 뒤
 * 완료 이벤트를 디스패치한다. 흐름 판단은 전부 core 의 transition 이 한다 — 여기서는 실행만 한다.
 */
export function usePlaySession(sessionId: number) {
  const [state, dispatch] = usePlayStore();
  const audio = useAudioOwnership();

  const [lines, setLines] = useState<PlayLine[]>([]);
  const [characterName, setCharacterName] = useState('');

  // 다음에 말할 캐릭터 대사. 첫 대사는 장면에서, 이후는 발화 응답에서 온다
  const pendingLineRef = useRef('');
  // reviewing → analyzing 진입 시 생성해 재시도 동안 재사용하고, 턴이 끝나면 버린다
  const idempotencyKeyRef = useRef<string | null>(null);
  // 같은 phase 로 두 번 실행되지 않게 막는다(개발 모드의 이펙트 재실행 포함)
  const ranForPhaseRef = useRef<Phase | null>(null);
  const lineIdRef = useRef(0);

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: Number.isFinite(sessionId),
  });

  function pushLine(speaker: PlayLine['speaker'], text: string) {
    lineIdRef.current += 1;
    setLines((prev) => [...prev, { id: lineIdRef.current, speaker, text }]);
  }

  useEffect(() => {
    return () => audio.releaseAll();
  }, [audio]);

  useEffect(() => {
    const phase = state.phase;
    if (ranForPhaseRef.current === phase) return;
    ranForPhaseRef.current = phase;

    const story = session.data;
    // 중단 플래그를 두지 않는다. transition 은 현재 phase 와 맞지 않는 이벤트를 무시하므로
    // 늦게 도착한 디스패치는 그대로 무해하다. 중복 실행은 위의 phase 가드가 막는다

    async function run() {
      switch (phase.tag) {
        case 'loading': {
          if (!story || story.currentSceneId === null) {
            dispatch({ type: 'SCENE_LOAD_FAILED', message: '이야기를 불러오지 못했어요.' });
            return;
          }
          try {
            const loaded = await loadScene(story.storyId, story.currentSceneId);
            setCharacterName(loaded.characterName);
            // 장면 조회 응답의 고정 대사에는 자리표시자 ㅇㅇ 가 그대로 들어 있다.
            // (발화 응답의 대사는 서버가 이미 치환해서 준다)
            pendingLineRef.current = loaded.characterOpening.replaceAll('ㅇㅇ', story.childName);
            dispatch({ type: 'SCENE_LOADED', scene: loaded.plan });
          } catch {
            dispatch({ type: 'SCENE_LOAD_FAILED', message: '장면을 불러오지 못했어요.' });
          }
          return;
        }

        case 'speaking': {
          const text = pendingLineRef.current;
          if (text) pushLine('character', text);
          try {
            const voice = await synthesize(text);
            await audio.play(voice);
          } catch {
            // 음성이 안 나와도 대화는 이어져야 한다
          }
          dispatch({ type: 'SPEECH_ENDED' });
          return;
        }

        case 'recording': {
          // 마이크가 열려야 사용자가 말할 수 있다. 전송은 사용자 탭이 결정한다
          try {
            await audio.startMic();
          } catch {
            dispatch({ type: 'STT_FAILED' });
          }
          return;
        }

        case 'transcribing': {
          try {
            const blob = await audio.stopMic();
            if (!blob || blob.size === 0) {
              dispatch({ type: 'STT_FAILED' });
              return;
            }
            const result = await transcribe(blob);
            if (!result.text.trim()) {
              dispatch({ type: 'STT_FAILED' });
              return;
            }
            dispatch({ type: 'STT_SUCCEEDED', transcript: result });
          } catch {
            dispatch({ type: 'STT_FAILED' });
          }
          return;
        }

        case 'analyzing': {
          const transcript = state.transcript;
          const scene = state.scene;
          if (!story || !transcript || !scene) {
            dispatch({ type: 'ANALYSIS_FAILED' });
            return;
          }
          idempotencyKeyRef.current ??= crypto.randomUUID();
          try {
            const data = await submitUtterance(
              story.sessionId,
              {
                sceneId: scene.sceneId,
                text: transcript.text,
                sttRawText: transcript.sttRawText,
              },
              idempotencyKeyRef.current,
            );
            pendingLineRef.current = data.characterMessage.text;
            dispatch({
              type: 'ANALYSIS_SUCCEEDED',
              outcome: {
                characterText: data.characterMessage.text,
                isClosing: data.characterMessage.isClosing,
                sceneCompleted: data.sceneCompleted,
                nextSceneId: data.nextSceneId,
                showMission: data.showMission,
              },
            });
          } catch {
            dispatch({ type: 'ANALYSIS_FAILED' });
          }
          return;
        }

        default:
          return;
      }
    }

    // 턴이 끝났으면 Idempotency-Key 를 버린다(재시도 동안에는 유지된다)
    if (phase.tag === 'awaitingChild' || phase.tag === 'recording' || phase.tag === 'sceneComplete') {
      idempotencyKeyRef.current = null;
    }
    // 아이 발화는 분석에 들어가는 순간 로그에 남긴다
    if (phase.tag === 'analyzing' && state.transcript) {
      pushLine('child', state.transcript.text);
    }

    void run();
    // state.transcript·state.scene 은 phase 변화와 함께 갱신되므로 phase 만 의존성으로 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, session.data, dispatch]);

  return {
    state,
    dispatch,
    lines,
    characterName,
    session,
  };
}
