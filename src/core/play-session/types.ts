import type { MissionType } from '@/core/api/types';

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
  | { tag: 'mission'; missionType: MissionType } // 미션 안내 — 아이가 읽고 말로 답한다
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
// showMission·missionType 은 백엔드가 노출 시점(조건·강제)까지 판단해 내려준다 —
// 전이는 그대로 믿고, 캐릭터 대사가 끝난 뒤 미션 안내를 끼워 넣는다
export interface UtteranceOutcome {
  characterText: string;
  isClosing: boolean;
  sceneCompleted: boolean;
  nextSceneId: number | null;
  showMission?: boolean;
  missionType?: MissionType | null;
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
  /** 미션 안내를 읽고 닫았다 — 이어서 아이 차례가 된다 */
  | { type: 'MISSION_DISMISSED' }
  // 이펙트 완료 (과거형) — useEffectRunner가 디스패치한다
  | { type: 'SCENE_LOADED'; scene: ScenePlan }
  | { type: 'SCENE_LOAD_FAILED'; message: string }
  | { type: 'NARRATION_SENTENCE_ENDED' }
  | { type: 'SPEECH_ENDED' }
  | { type: 'STT_SUCCEEDED'; transcript: Transcript }
  /**
   * silent: 녹음이 비어 있었다(마이크에 소리가 안 들어옴)
   * unclear: 음성은 들어왔는데 인식이 안 됐다 — 이것만 3회 누적 안내 대상이다
   */
  | { type: 'STT_FAILED'; reason?: 'silent' | 'unclear' }
  /** 마이크를 켜지 못했다. recording 에서만 유효하다 */
  | { type: 'MIC_FAILED'; reason: 'permission' | 'no-device' | 'unknown' }
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
  /** 캐릭터 대사가 끝나면 띄울 미션. 응답이 왔을 때가 아니라 대사가 끝났을 때 보여준다 */
  pendingMission: MissionType | null;
  /**
   * 이미 보여준 미션. 백엔드는 조건이 유지되는 동안 **매 턴** showMission=true 를
   * 다시 보낸다(실백엔드 완주에서 미션 6회 확인) — 같은 미션은 한 번만 보여준다.
   * 미션1·미션2 는 각각 다른 장면에 붙어 있어 세션 전체 기준으로 기억해도 안전하다
   */
  shownMissions: MissionType[];
}

export const INITIAL_STATE: PlayState = {
  phase: { tag: 'locked' },
  scene: null,
  transcript: null,
  consecutiveFailures: 0,
  completion: null,
  failureSource: null,
  pendingMission: null,
  shownMissions: [],
};

// Idempotency-Key는 core 밖에서 관리한다 — UUID 생성은 부수효과이고 전이가 분기하지 않는다.
// useEffectRunner가 reviewing→analyzing 진입 시 생성하고,
// error('analysis')→analyzing 재시도 동안 재사용, awaitingChild/recording/sceneComplete 도달 시 폐기한다.

// 오류 문구 — 확정 시 교체
export const STT_RETRY_COPY = '잘 안 들렸어요. 한 번만 더 말해 줄래요?';
export const STT_QUIET_COPY = '조용한 곳으로 옮겨서 다시 해 볼까요?';
export const ANALYSIS_RETRY_COPY = '잠깐 문제가 생겼어요. 다시 보내 볼까요?';
export const STT_FAILURE_THRESHOLD = 3;

/*
 * 마이크 자체가 안 켜졌을 때의 문구.
 * 예전에는 이 경우에도 "잘 안 들렸어요" 가 떠서, 마이크가 막혀 있는데 아이 목소리 탓으로 안내했다.
 * 아이가 아니라 어른이 조치해야 하는 상황이라 문구를 따로 둔다
 */
export const MIC_PERMISSION_COPY = '마이크를 쓸 수 있게 허용해 주세요.';
export const MIC_NO_DEVICE_COPY = '마이크를 찾지 못했어요. 연결을 확인해 줄래요?';
export const MIC_UNKNOWN_COPY = '마이크를 켜지 못했어요. 다시 해볼까요?';
/** 녹음은 됐는데 소리가 하나도 안 들어온 경우 */
export const STT_SILENT_COPY = '소리가 들어오지 않았어요. 마이크를 확인해 줄래요?';

/*
 * 미션 안내 문구 — MVP 문서 §4 의 미션 설명을 아이 말로 옮겼다.
 * 미션 결과를 제출하는 API 는 없다: 아이가 안내를 읽고 **말로 답하면**
 * 그 발화가 utterances 로 흘러가 캐릭터 대화에 반영되는 구조다.
 * 디자인 확정본에도 미션 화면이 없어 문구는 여기 한곳에 모아 두고 갈아끼운다
 */
export const MISSION_COPY: Record<MissionType, { title: string; body: string }> = {
  MISSION_1: {
    title: '높은 배 따기 대작전!',
    body: '배를 어떻게 딸지 말해 줘. 무엇을 사용할지, 사람들은 어디로 피하면 좋을지, 며느리에게는 어떻게 부탁할지, 그러면 어떤 일이 일어날지 생각해 봐.',
  },
  MISSION_2: {
    title: '단점을 장점으로 바꿔 봐!',
    body: '친구의 특징 하나를 골라 장점으로 바꿔 말해 줘. 예를 들면, 목소리가 큰 친구는 멀리 있는 친구를 부를 수 있어!',
  },
};
