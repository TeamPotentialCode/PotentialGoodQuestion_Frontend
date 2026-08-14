'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase } from '@/core/play-session/types';
import { submitUtterance, synthesize, transcribe } from '@/features/play/api';
import { loadScene, type NarrationPage } from '@/features/play/scene-source';
import { useAudioOwnership } from '@/features/play/useAudioOwnership';
import { useMicLevel } from '@/features/play/use-mic-level';
import { usePlayStore } from '@/features/play/usePlayStore';
import { getSession } from '@/features/story/api';

/**
 * 마이크·STT 가 왜 실패했는지는 화면 문구만으로는 알 수 없다.
 * 개발 모드에서만 콘솔에 남긴다 — 프로덕션 번들에는 들어가지 않는다
 */
function diagnose(what: string, detail: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.info(`[음성] ${what}`, detail);
  }
}

interface SceneView {
  characterName: string;
  sceneDescription: string;
  imageUrl: string | null;
  narration: NarrationPage[];
  narrationTotal: number;
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
  // 지금 불러올 장면. 장면을 완주하면 nextSceneId 로 갱신된다
  const [sceneCursor, setSceneCursor] = useState<number | null>(null);

  const pendingLineRef = useRef('');
  // 다시 듣기용 — 이미 받은 음성을 재사용해 TTS 를 다시 부르지 않는다
  const narrationAudioRef = useRef(new Map<number, Blob>());
  const lineAudioRef = useRef<Blob | null>(null);
  const sceneAudioRef = useRef<Blob | null>(null);
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
          // 첫 진입은 세션이 알려준 장면, 이후는 직전 장면이 알려준 다음 장면
          const from = sceneCursor ?? story?.currentSceneId ?? null;
          if (!story || from === null) {
            dispatch({ type: 'SCENE_LOAD_FAILED', message: '이야기를 불러오지 못했어요.' });
            return;
          }
          try {
            const loaded = await loadScene(story.storyId, from);
            narrationAudioRef.current.clear();
            sceneAudioRef.current = null;
            setScene({
              characterName: loaded.characterName,
              sceneDescription: loaded.sceneDescription,
              imageUrl: loaded.imageUrl,
              narration: loaded.narration,
              narrationTotal: loaded.narrationTotal,
              dialogueIndex: loaded.dialogueIndex,
              dialogueTotal: loaded.dialogueTotal,
            });
            // 고정 대사의 ㅇㅇ 는 치환하지 않는다 — 시안이 원문을 두고 주석으로 설명한다
            pendingLineRef.current = loaded.characterOpening;
            setCharacterLine('');
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
            narrationAudioRef.current.set(phase.sentenceIndex, voice);
            await audio.play(voice);
          } catch {
            // 음성이 안 나와도 이야기는 이어져야 한다
          }
          // 자동으로 넘기지 않는다 — 아이가 "다음"을 누른다(TAP_NEXT)
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
          } catch (error) {
            // 예전에는 STT_FAILED 를 보냈는데 transition 이 transcribing 에서만 받아서
            // 신호가 버려졌다 — 마이크가 막혀도 화면이 "듣고 있어요…" 에 그대로 머물렀다
            const name = error instanceof DOMException ? error.name : '';
            diagnose('마이크를 켜지 못함', { name });
            dispatch({
              type: 'MIC_FAILED',
              reason:
                name === 'NotAllowedError'
                  ? 'permission'
                  : name === 'NotFoundError' || name === 'OverconstrainedError'
                    ? 'no-device'
                    : 'unknown',
            });
          }
          return;
        }

        case 'transcribing': {
          try {
            const blob = await audio.stopMic();
            diagnose('녹음 결과', { size: blob?.size ?? 0, type: blob?.type ?? '없음' });
            if (!blob || blob.size === 0) {
              dispatch({ type: 'STT_FAILED', reason: 'silent' });
              return;
            }
            const result = await transcribe(blob);
            diagnose('STT 응답', { text: result.text });
            if (!result.text.trim()) {
              dispatch({ type: 'STT_FAILED', reason: 'unclear' });
              return;
            }
            dispatch({ type: 'STT_SUCCEEDED', transcript: result });
          } catch (error) {
            diagnose('STT 실패', { error: String(error) });
            dispatch({ type: 'STT_FAILED', reason: 'unclear' });
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
                missionType: data.missionType,
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
    // 장면을 완주했으면 다음 장면 위치를 기억해 둔다. TAP_NEXT_SCENE 이 loading 으로 되돌린다
    if (phase.tag === 'sceneComplete' && phase.nextSceneId !== null) {
      setSceneCursor(phase.nextSceneId);
    }

    void run();
    // state.transcript·state.scene 은 phase 변화와 함께 갱신되므로 phase 만 의존성으로 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, session.data, dispatch]);

  // 다시 듣기 — 이미 받아둔 음성을 재생만 한다(상태는 바뀌지 않는다)
  const replayNarration = useCallback(() => {
    if (state.phase.tag !== 'narrating') return;
    const voice = narrationAudioRef.current.get(state.phase.sentenceIndex);
    if (voice) void audio.play(voice);
  }, [audio, state.phase]);

  const replayCharacterLine = useCallback(() => {
    if (lineAudioRef.current) void audio.play(lineAudioRef.current);
  }, [audio]);

  // 장면 설명은 자동으로 읽어주지 않는다(내레이션은 별도 화면이다).
  // 눌렀을 때만 음성을 만들고, 같은 장면에서 두 번째부터는 받아둔 걸 다시 쓴다
  const replaySceneDescription = useCallback(() => {
    const text = scene?.sceneDescription;
    if (!text) return;
    void (async () => {
      try {
        sceneAudioRef.current ??= await synthesize(text);
        await audio.play(sceneAudioRef.current);
      } catch {
        // 음성이 안 나와도 화면은 그대로다
      }
    })();
  }, [audio, scene?.sceneDescription]);

  const micLevel = useMicLevel(state.phase.tag === 'recording', audio.micLevel);

  // 지금 보여줄 내레이션 한 장 (narrating 이 아니면 null)
  const narrationPage =
    state.phase.tag === 'narrating' ? (scene?.narration[state.phase.sentenceIndex] ?? null) : null;

  return {
    state,
    dispatch,
    scene,
    narrationPage,
    characterLine,
    micLevel,
    session,
    replayNarration,
    replaySceneDescription,
    replayCharacterLine,
  };
}
