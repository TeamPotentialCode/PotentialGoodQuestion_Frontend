import {
  ANALYSIS_RETRY_COPY,
  STT_FAILURE_THRESHOLD,
  STT_QUIET_COPY,
  STT_RETRY_COPY,
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

    case 'NARRATION_SENTENCE_ENDED': {
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
          phase: { tag: 'sceneComplete', nextSceneId, postActivity: nextSceneId === null },
        };
      }
      return { ...state, phase: { tag: 'awaitingChild' } };
    }

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

    case 'STT_FAILED': {
      if (phase.tag !== 'transcribing') return state;
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

    case 'ANALYSIS_SUCCEEDED':
      if (phase.tag !== 'analyzing') return state;
      if (event.outcome.sceneCompleted) {
        return {
          ...state,
          transcript: null,
          completion: { nextSceneId: event.outcome.nextSceneId },
          phase: { tag: 'speaking', kind: 'closing' },
        };
      }
      return { ...state, transcript: null, phase: { tag: 'speaking', kind: 'reply' } };

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
