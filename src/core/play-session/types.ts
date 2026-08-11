// 플레이 세션 상태 모델
// variant에 부가 데이터를 추가하지 않는다. 전이에 필요한 값은 PlayState에 둔다.
export type Phase =
  | { tag: 'locked' } // 오디오 언락 대기
  | { tag: 'loading' }
  | { tag: 'narrating'; sentenceIndex: number } // 내레이션 문장 재생
  | { tag: 'speaking'; kind: 'opening' | 'reply' | 'closing' } // 캐릭터 대사 재생
  | { tag: 'awaitingChild' }
  | { tag: 'recording' }
  | { tag: 'transcribing' } // POST /speech/stt 진행
  | { tag: 'reviewing' } // "이렇게 말했나요?" 확인
  | { tag: 'analyzing' } // POST /sessions/:id/utterances 진행
  | { tag: 'error'; message: string; attempt: number }
  | { tag: 'sceneComplete'; nextSceneId: number | null; postActivity: boolean }
  | { tag: 'fatal'; message: string };

export type PhaseTag = Phase['tag'];

// 장면 진입 시 features가 내려주는 재생 계획.
// 내레이션 문장 분할은 로더 책임 — core는 분할된 결과만 받는다
export interface ScenePlan {
  sceneId: number;
  narrationSentences: string[];
  maxTurns: number;
}

export interface Transcript {
  text: string;
  sttRawText: string;
}

// utterances 응답 중 전이가 참조하는 부분.
// showMission은 백엔드가 내려주지만 전이는 무시한다
// 도입 시: { tag: 'mission' } phase + MISSION_DISMISSED 이벤트를 추가하면 된다
export interface UtteranceOutcome {
  characterText: string;
  isClosing: boolean;
  sceneCompleted: boolean;
  nextSceneId: number | null;
  showMission?: boolean;
}

export type PlayEvent =
  // 사용자 탭 (현재형)
  | { type: 'TAP_UNLOCK' }
  | { type: 'TAP_SPEAK' }
  | { type: 'TAP_SEND' }
  | { type: 'TAP_RERECORD' }
  | { type: 'TAP_RETRY' }
  // 내레이션은 오디오가 끝나도 자동으로 넘어가지 않는다 — 아이가 "다음"을 눌러 넘긴다
  | { type: 'TAP_NEXT' }
  | { type: 'TAP_NEXT_SCENE' }
  // 이펙트 완료 (과거형) — useEffectRunner가 디스패치한다
  | { type: 'SCENE_LOADED'; scene: ScenePlan }
  | { type: 'SCENE_LOAD_FAILED'; message: string }
  | { type: 'NARRATION_SENTENCE_ENDED' }
  | { type: 'SPEECH_ENDED' }
  | { type: 'STT_SUCCEEDED'; transcript: Transcript }
  | { type: 'STT_FAILED' }
  | { type: 'ANALYSIS_SUCCEEDED'; outcome: UtteranceOutcome }
  | { type: 'ANALYSIS_FAILED' };

export interface PlayState {
  phase: Phase;
  scene: ScenePlan | null;
  transcript: Transcript | null;
  consecutiveFailures: number; // STT 실패만 센다
  // analyzing → speaking(closing) → sceneComplete 사이에 nextSceneId를 보관
  completion: { nextSceneId: number | null } | null;
  failureSource: 'stt' | 'analysis' | null; // TAP_RETRY 분기용
}

export const INITIAL_STATE: PlayState = {
  phase: { tag: 'locked' },
  scene: null,
  transcript: null,
  consecutiveFailures: 0,
  completion: null,
  failureSource: null,
};

// Idempotency-Key는 core 밖에서 관리한다 — UUID 생성은 부수효과이고 전이가 분기하지 않는다.
// useEffectRunner가 reviewing→analyzing 진입 시 생성하고,
// error('analysis')→analyzing 재시도 동안 재사용, awaitingChild/recording/sceneComplete 도달 시 폐기한다.

// 오류 문구 — 확정 시 교체
export const STT_RETRY_COPY = '잘 안 들렸어요. 한 번만 더 말해 줄래요?';
export const STT_QUIET_COPY = '조용한 곳으로 옮겨서 다시 해 볼까요?';
export const ANALYSIS_RETRY_COPY = '잠깐 문제가 생겼어요. 다시 보내 볼까요?';
export const STT_FAILURE_THRESHOLD = 3;
