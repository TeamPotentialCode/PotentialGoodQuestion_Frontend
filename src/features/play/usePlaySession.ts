'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase } from '@/core/play-session/types';
import {
  completeNarrationScene,
  submitUtterance,
  synthesize,
  transcribe,
} from '@/features/play/api';
import { loadScene, type NarrationPage } from '@/features/play/scene-source';
import { hasUserGesture, useAudioOwnership } from '@/features/play/useAudioOwnership';
import { characterVoice, NARRATOR_VOICE } from '@/features/play/voices';
import { useMicLevel } from '@/features/play/use-mic-level';
import { usePlayStore } from '@/features/play/usePlayStore';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getSession } from '@/features/story/api';

/**
 * 고정 대사에는 아이 이름 자리에 ㅇㅇ 가 박혀 온다.
 * 이름을 모르면 원문을 그대로 둔다 — "아, 사실 나는" 처럼 어색해지는 것보다 낫다
 */
function withChildName(text: string, name: string): string {
  return name ? text.replaceAll('ㅇㅇ', name) : text;
}

/**
 * 마이크·STT 가 왜 실패했는지는 화면 문구만으로는 알 수 없다.
 * 개발 모드에서만 콘솔에 남긴다 — 프로덕션 번들에는 들어가지 않는다
 */
function diagnose(what: string, detail: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.info(`[음성] ${what}`, detail);
  }
}

/** "이제 네 차례야!" 를 보여주고 마이크를 켜기까지의 틈 */
const CHILD_READY_DELAY_MS = 900;

/** 시안 우측 하단 "최근 이야기" 한 줄 */
export interface TurnLogEntry {
  speaker: 'character' | 'child';
  /** 화면에 그대로 찍는 이름. 아이는 "문열 (나)" 처럼 표시한다 */
  name: string;
  text: string;
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
  // 고정 대사의 ㅇㅇ 를 실제 이름으로 바꾸는 데 쓴다(시안: "민준아, …")
  const childName = useSelectedChild(Number.isFinite(sessionId)).selected?.name ?? '';
  const childNameRef = useRef(childName);

  const [scene, setScene] = useState<SceneView | null>(null);
  // 화면에 크게 보이는 건 지금 대사 하나뿐이고, 지나간 대사는 "최근 이야기"에 쌓인다
  const [characterLine, setCharacterLine] = useState('');
  const [turnLog, setTurnLog] = useState<TurnLogEntry[]>([]);
  // 지금 불러올 장면. 장면을 완주하면 nextSceneId 로 갱신된다
  const [sceneCursor, setSceneCursor] = useState<number | null>(null);

  // "최근 이야기" 에 적을 캐릭터 이름. 장면을 불러올 때 함께 채운다
  const characterNameRef = useRef('');
  // opening 직전에 낭독할 장면 설명 — 이펙트가 phase 만 의존성으로 두므로 ref 로 건넨다
  const sceneDescriptionRef = useRef('');

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

  // 이펙트는 phase 만 의존성으로 두므로 이름은 ref 로 건네준다
  useEffect(() => {
    childNameRef.current = childName;
  }, [childName]);

  /*
   * locked 는 자동재생 정책용 "첫 제스처 보장" 상태일 뿐 화면이 아니다.
   * 클릭·키로 들어왔으면(문서에 제스처 이력 있음) 곧장 해제한다.
   * 제스처가 없는 경우(새로고침·주소 직접 입력)는 화면 쪽이 상세로 돌려보낸다 —
   * 거기서 "이어서 하기"를 누르는 탭이 제스처가 된다
   */
  useEffect(() => {
    if (state.phase.tag !== 'locked') return;
    // 세션 응답이 와야 어느 장면부터인지 안다 — 응답 전에 풀면 fatal 로 떨어진다
    if (!session.data) return;
    if (hasUserGesture()) dispatch({ type: 'TAP_UNLOCK' });
  }, [state.phase, session.data, dispatch]);

  /*
   * 시안 v3: 캐릭터 TTS 가 끝나면 아이가 "말하기"를 누르지 않는다 — 마이크가 저절로 켜진다.
   * 다만 곧바로 켜면 화면이 바뀐 걸 아이가 못 알아채므로 "이제 네 차례야!" 를 잠깐 보여준다.
   * 마이크를 못 켜면 MIC_FAILED 가 error 로 보내고, 거기서 "다시 해보기" 로 복구한다
   */
  useEffect(() => {
    if (state.phase.tag !== 'awaitingChild') return;
    const timer = setTimeout(() => dispatch({ type: 'TAP_SPEAK' }), CHILD_READY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.phase, dispatch]);

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
            characterNameRef.current = loaded.characterName;
            sceneDescriptionRef.current = loaded.sceneDescription;
            pendingLineRef.current = withChildName(loaded.characterOpening, childNameRef.current);
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
            const voice = await synthesize(text, NARRATOR_VOICE);
            narrationAudioRef.current.set(phase.sentenceIndex, voice);
            await audio.play(voice);
          } catch {
            // 음성이 안 나와도 이야기는 이어져야 한다
          }
          // 자동으로 넘기지 않는다 — 아이가 "다음"을 누른다(TAP_NEXT)
          return;
        }

        case 'speaking': {
          /*
           * 장면에 처음 들어올 때(opening)는 장면 설명을 내레이터 목소리로 먼저 읽어준다
           * (팀 결정 2026-08-14: 설명도 다 읽는다 — 원문 수준의 긴 문단이 들어올 예정).
           * 받은 음성은 sceneAudioRef 에 캐시해 "다시 듣기"가 재호출 없이 재사용한다
           */
          if (phase.kind === 'opening' && sceneDescriptionRef.current) {
            try {
              sceneAudioRef.current ??= await synthesize(
                sceneDescriptionRef.current,
                NARRATOR_VOICE,
              );
              await audio.play(sceneAudioRef.current);
            } catch {
              // 설명 낭독이 실패해도 대사는 이어져야 한다
            }
          }
          const text = pendingLineRef.current;
          setCharacterLine(text);
          setTurnLog((log) => [
            ...log,
            { speaker: 'character', name: characterNameRef.current || '캐릭터', text },
          ]);
          try {
            const voice = await synthesize(text, characterVoice(characterNameRef.current));
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
          setTurnLog((log) => [
            ...log,
            { speaker: 'child', name: `${childNameRef.current || '나'} (나)`, text: transcript.text },
          ]);
          idempotencyKeyRef.current ??= crypto.randomUUID();
          try {
            const data = await submitUtterance(
              story.sessionId,
              { sceneId: plan.sceneId, text: transcript.text, sttRawText: transcript.sttRawText },
              idempotencyKeyRef.current,
            );
            pendingLineRef.current = withChildName(
              data.characterMessage.text,
              childNameRef.current,
            );
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
        sceneAudioRef.current ??= await synthesize(text, NARRATOR_VOICE);
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

  /*
   * "다음" — 서버에 이 내레이션을 다 봤다고 알리고(이어하기 위치 저장) 다음 장으로.
   * 알림은 흐름을 막지 않는다: 실패해도 이야기는 계속돼야 하고, 위치 저장은 보너스다
   */
  const advanceNarration = useCallback(() => {
    if (narrationPage) {
      void completeNarrationScene(sessionId, narrationPage.sceneId).catch(() => {});
    }
    dispatch({ type: 'TAP_NEXT' });
  }, [narrationPage, sessionId, dispatch]);

  return {
    state,
    dispatch,
    scene,
    narrationPage,
    characterLine,
    turnLog,
    micLevel,
    session,
    replayNarration,
    advanceNarration,
    replaySceneDescription,
    replayCharacterLine,
  };
}
