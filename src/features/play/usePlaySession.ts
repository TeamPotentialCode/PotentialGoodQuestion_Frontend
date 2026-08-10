'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase } from '@/core/play-session/types';
import { submitUtterance, synthesize, transcribe } from '@/features/play/api';
import { loadScene } from '@/features/play/scene-source';
import { useAudioOwnership } from '@/features/play/useAudioOwnership';
import { usePlayStore } from '@/features/play/usePlayStore';
import { getSession } from '@/features/story/api';

interface SceneView {
  characterName: string;
  sceneDescription: string;
  imageUrl: string | null;
  dialogueIndex: number;
  dialogueTotal: number;
}

/**
 * 대화 화면의 두뇌. 상태 머신·오디오·API 를 한곳에서 잇는다.
 *
 * 진행형 phase(loading/narrating/speaking/recording/transcribing/analyzing)를 보고
 * 부수효과를 실행한 뒤 완료 이벤트를 디스패치한다.
 * 흐름 판단은 전부 core 의 transition 이 한다 — 여기서는 실행만 한다.
 */
export function usePlaySession(sessionId: number) {
  const [state, dispatch] = usePlayStore();
  const audio = useAudioOwnership();

  const [scene, setScene] = useState<SceneView | null>(null);
  // 시안은 대화 로그를 쌓지 않는다 — 지금 캐릭터 대사 하나만 보여준다
  const [characterLine, setCharacterLine] = useState('');

  const pendingLineRef = useRef('');
  // 다시 듣기용 — 이미 받은 음성을 재사용해 TTS 를 다시 부르지 않는다
  const sceneAudioRef = useRef<Blob | null>(null);
  const lineAudioRef = useRef<Blob | null>(null);
  // reviewing → analyzing 진입 시 생성해 재시도 동안 재사용하고, 턴이 끝나면 버린다
  const idempotencyKeyRef = useRef<string | null>(null);
  // 같은 phase 로 두 번 실행되지 않게 막는다(개발 모드의 이펙트 재실행 포함)
  const ranForPhaseRef = useRef<Phase | null>(null);

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: Number.isFinite(sessionId),
  });

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
            setScene({
              characterName: loaded.characterName,
              sceneDescription: loaded.sceneDescription,
              imageUrl: loaded.imageUrl,
              dialogueIndex: loaded.dialogueIndex,
              dialogueTotal: loaded.dialogueTotal,
            });
            // 고정 대사의 ㅇㅇ 는 치환하지 않는다 — 시안이 원문을 두고 주석으로 설명한다
            pendingLineRef.current = loaded.characterOpening;
            dispatch({ type: 'SCENE_LOADED', scene: loaded.plan });
          } catch {
            dispatch({ type: 'SCENE_LOAD_FAILED', message: '장면을 불러오지 못했어요.' });
          }
          return;
        }

        case 'narrating': {
          const text = state.scene?.narrationSentences[phase.sentenceIndex] ?? '';
          try {
            const voice = await synthesize(text);
            sceneAudioRef.current = voice;
            await audio.play(voice);
          } catch {
            // 음성이 안 나와도 이야기는 이어져야 한다
          }
          dispatch({ type: 'NARRATION_SENTENCE_ENDED' });
          return;
        }

        case 'speaking': {
          const text = pendingLineRef.current;
          setCharacterLine(text);
          try {
            const voice = await synthesize(text);
            lineAudioRef.current = voice;
            await audio.play(voice);
          } catch {
            // 음성이 안 나와도 대화는 이어져야 한다
          }
          dispatch({ type: 'SPEECH_ENDED' });
          return;
        }

        case 'recording': {
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
          const plan = state.scene;
          if (!story || !transcript || !plan) {
            dispatch({ type: 'ANALYSIS_FAILED' });
            return;
          }
          idempotencyKeyRef.current ??= crypto.randomUUID();
          try {
            const data = await submitUtterance(
              story.sessionId,
              { sceneId: plan.sceneId, text: transcript.text, sttRawText: transcript.sttRawText },
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

    void run();
    // state.transcript·state.scene 은 phase 변화와 함께 갱신되므로 phase 만 의존성으로 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, session.data, dispatch]);

  // 다시 듣기 — 이미 받아둔 음성을 재생만 한다(상태는 바뀌지 않는다)
  const replaySceneDescription = useCallback(() => {
    if (sceneAudioRef.current) void audio.play(sceneAudioRef.current);
  }, [audio]);

  const replayCharacterLine = useCallback(() => {
    if (lineAudioRef.current) void audio.play(lineAudioRef.current);
  }, [audio]);

  return {
    state,
    dispatch,
    scene,
    characterLine,
    session,
    replaySceneDescription,
    replayCharacterLine,
  };
}
