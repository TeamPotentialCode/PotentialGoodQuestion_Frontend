import {
  ANALYSIS_RETRY_COPY,
  MIC_NO_DEVICE_COPY,
  MIC_PERMISSION_COPY,
  MIC_UNKNOWN_COPY,
  STT_FAILURE_THRESHOLD,
  STT_QUIET_COPY,
  STT_RETRY_COPY,
  STT_SILENT_COPY,
  type PlayEvent,
  type PlayState,
} from './types';

// 순수 전이 함수. 이펙트 기술을 반환하지 않는다 —
// 진행형 phase(loading/transcribing/analyzing/narrating/speaking) 자체가 선언적 이펙트 기술이고,
// 완료 이벤트는 useEffectRunner가 디스패치한다.
// 명시되지 않은 (phase, event) 조합은 입력 state를 동일 참조로 반환한다.
export function transition(state: PlayState, event: PlayEvent): PlayState {
  const { phase } = state;

  switch (event.type) {
    case 'TAP_UNLOCK':
      if (phase.tag !== 'locked') return state;
      return { ...state, phase: { tag: 'loading' } };

    case 'SCENE_LOADED': {
      if (phase.tag !== 'loading') return state;
      const hasNarration = event.scene.narrationSentences.length > 0;
      return {
        ...state,
        scene: event.scene,
        phase: hasNarration
          ? { tag: 'narrating', sentenceIndex: 0 }
          : { tag: 'speaking', kind: 'opening' },
      };
    }

    case 'SCENE_LOAD_FAILED':
      if (phase.tag !== 'loading') return state;
      return { ...state, phase: { tag: 'fatal', message: event.message } };

    // 오디오가 끝났을 때(NARRATION_SENTENCE_ENDED)와 "다음"을 눌렀을 때(TAP_NEXT) 전이가 같다.
    // 지금 화면은 TAP_NEXT 만 쓰지만, 자동 진행으로 바꿔도 core 는 그대로다
    case 'NARRATION_SENTENCE_ENDED':
    case 'TAP_NEXT': {
      if (phase.tag !== 'narrating' || state.scene === null) return state;
      const next = phase.sentenceIndex + 1;
      return {
        ...state,
        phase:
          next < state.scene.narrationSentences.length
            ? { tag: 'narrating', sentenceIndex: next }
            : { tag: 'speaking', kind: 'opening' },
      };
    }

    case 'SPEECH_ENDED': {
      if (phase.tag !== 'speaking') return state;
      if (phase.kind === 'closing') {
        const nextSceneId = state.completion?.nextSceneId ?? null;
        return {
          ...state,
          completion: null,
          // 장면이 끝나면 미션도 의미가 없다 — 남은 신호는 버린다
          pendingMission: null,
          phase: { tag: 'sceneComplete', nextSceneId, postActivity: nextSceneId === null },
        };
      }
      // 백엔드가 미션을 켜라고 했으면 캐릭터 대사가 끝난 지금 보여준다.
      // 응답이 온 순간이 아니라 대사가 끝난 뒤여야 아이가 대사를 놓치지 않는다
      if (state.pendingMission !== null) {
        return {
          ...state,
          pendingMission: null,
          phase: { tag: 'mission', missionType: state.pendingMission },
        };
      }
      return { ...state, phase: { tag: 'awaitingChild' } };
    }

    // 미션을 읽고 닫으면 아이 차례 — 화면이 마이크를 저절로 켠다
    case 'MISSION_DISMISSED':
      if (phase.tag !== 'mission') return state;
      return { ...state, phase: { tag: 'awaitingChild' } };

    case 'TAP_SPEAK':
      if (phase.tag !== 'awaitingChild') return state;
      return { ...state, phase: { tag: 'recording' } };

    case 'TAP_SEND':
      if (phase.tag === 'recording') return { ...state, phase: { tag: 'transcribing' } };
      if (phase.tag === 'reviewing') return { ...state, phase: { tag: 'analyzing' } };
      return state;

    case 'STT_SUCCEEDED':
      if (phase.tag !== 'transcribing') return state;
      return {
        ...state,
        transcript: event.transcript,
        consecutiveFailures: 0,
        failureSource: null,
        phase: { tag: 'reviewing' },
      };

    // 마이크가 안 켜진 것은 아이 잘못이 아니다.
    // 연속 실패 카운터를 올리지 않아서 "조용한 곳으로 옮겨서" 안내로 번지지 않게 한다
    case 'MIC_FAILED': {
      if (phase.tag !== 'recording') return state;
      const message =
        event.reason === 'permission'
          ? MIC_PERMISSION_COPY
          : event.reason === 'no-device'
            ? MIC_NO_DEVICE_COPY
            : MIC_UNKNOWN_COPY;
      // failureSource 를 stt 로 두면 "다시 시도"가 녹음으로 돌아간다
      return { ...state, failureSource: 'stt', phase: { tag: 'error', message, attempt: 1 } };
    }

    case 'STT_FAILED': {
      if (phase.tag !== 'transcribing') return state;
      // 소리가 아예 안 들어온 것도 아이 잘못이 아니라 장치 문제다 — 카운터를 올리지 않는다
      if (event.reason === 'silent') {
        return {
          ...state,
          failureSource: 'stt',
          phase: { tag: 'error', message: STT_SILENT_COPY, attempt: 1 },
        };
      }
      const attempt = state.consecutiveFailures + 1;
      return {
        ...state,
        consecutiveFailures: attempt,
        failureSource: 'stt',
        phase: {
          tag: 'error',
          message: attempt >= STT_FAILURE_THRESHOLD ? STT_QUIET_COPY : STT_RETRY_COPY,
          attempt,
        },
      };
    }

    case 'TAP_RERECORD':
      if (phase.tag !== 'reviewing') return state;
      // 재녹음 시 기존 임시 결과 폐기
      return { ...state, transcript: null, phase: { tag: 'recording' } };

    case 'ANALYSIS_SUCCEEDED': {
      if (phase.tag !== 'analyzing') return state;
      // 미션 신호는 대사 재생이 끝날 때까지 들고 있는다
      const pendingMission =
        event.outcome.showMission === true ? (event.outcome.missionType ?? null) : null;
      if (event.outcome.sceneCompleted) {
        return {
          ...state,
          transcript: null,
          pendingMission,
          completion: { nextSceneId: event.outcome.nextSceneId },
          phase: { tag: 'speaking', kind: 'closing' },
        };
      }
      return { ...state, transcript: null, pendingMission, phase: { tag: 'speaking', kind: 'reply' } };
    }

    case 'ANALYSIS_FAILED':
      if (phase.tag !== 'analyzing') return state;
      // STT 실패 카운터는 건드리지 않는다
      return {
        ...state,
        failureSource: 'analysis',
        phase: { tag: 'error', message: ANALYSIS_RETRY_COPY, attempt: 1 },
      };

    case 'TAP_RETRY':
      if (phase.tag !== 'error') return state;
      return {
        ...state,
        phase: state.failureSource === 'analysis' ? { tag: 'analyzing' } : { tag: 'recording' },
      };

    case 'TAP_NEXT_SCENE':
      if (phase.tag !== 'sceneComplete') return state;
      return { ...state, scene: null, completion: null, phase: { tag: 'loading' } };
  }
}
