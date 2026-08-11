// 백엔드 API 계약 타입 — 목(mocks)과 client.ts가 공유하는 단일 정의.
// 확정 계약: 인증, utterances·stt·tts·reports
// 나머지(home/stories/sessions/사후활동)는 백엔드 확정 시 여기만 수정한다.

// 공통 응답 봉투.
// 에러 응답도 같은 봉투이고 code 필드는 오지 않는다.
//   401 { success:false, message:"인증이 필요합니다.", data:null }
//   409 { success:false, message:"이미 사용 중인 이메일입니다.", data:null }
// 따라서 화면은 code가 아니라 HTTP 상태로 분기해야 한다. code는 향후 대비용 optional
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string;
  code?: string;
}

// 사고 요소 8종 (대화작동규칙)
export type ThinkingElement =
  | 'REASON'
  | 'EMOTION'
  | 'PERSPECTIVE'
  | 'SOLUTION'
  | 'REQUEST'
  | 'RESULT'
  | 'DECISION'
  | 'EMPATHY';

export type UtteranceValidity = 'VALID' | 'OFF_TOPIC' | 'SHORT' | 'UNCLEAR';
export type ProgressMode = 'NORMAL' | 'GUIDED' | 'CLOSING';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';

// ---------- 인증 (확정) ----------

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  parentId: number;
  name: string;
}

// ---------- 아이 프로필 ----------
// 응답은 birthYear와 age를 둘 다 준다(age는 서버가 계산). 요청은 age로 보낸다
export interface Child {
  childId: number;
  name: string;
  birthYear: number;
  age: number;
  createdAt: string;
}

export interface ChildUpsertRequest {
  name: string;
  age: number;
}

// ---------- 이야기 (실측 확정) ----------
// thumbnailUrl 은 시드에 실재하지 않는 더미 주소가 들어 있어 아직 렌더하지 않는다

export interface StorySummary {
  storyId: number;
  title: string;
  thumbnailUrl: string;
  estimatedMinutes: number;
  difficulty: string;
  topics: string[];
}

export interface StoryDetail extends StorySummary {
  summary: string;
  introduction: string;
  situation: string;
  childRole: string;
}

// ---------- 홈 (실측 확정) ----------

export interface ContinueSession {
  sessionId: number;
  storyId: number;
  storyTitle: string;
  thumbnailUrl: string;
  currentSceneId: number | null;
  currentSceneOrder: number | null;
  status: SessionStatus;
  lastActivityAt: string;
}

export interface HomeData {
  // 가장 최근 IN_PROGRESS 세션 1건. 없으면 null (배열이 아니다)
  continueSession: ContinueSession | null;
  // published 상위 3건 고정 — 서버에 추천 로직은 아직 없다
  recommendedStories: StorySummary[];
}

// ---------- 세션 ----------

export interface SessionInfo {
  sessionId: number;
  storyId: number;
  storyTitle: string;
  childId: number;
  childName: string;
  status: SessionStatus;
  // 세션 생성 직후에는 내레이션 장면을 가리킨다
  currentSceneId: number | null;
  currentChildTurnCount: number;
  startedAt: string;
  completedAt: string | null;
}

// ---------- 장면 ----------
// GET /api/stories/{storyId}/scenes/{sceneId} — 딱 이 7개 필드다.
// characterName 이 null 이면 내레이션 장면이다.
// maxTurns·characterClosing 은 내려주지 않는다(백엔드에 추가 요청 중).
// 장면 목록 API 도 아직 없어서 sceneId 를 하나씩 조회해야 한다.

export interface SceneInfo {
  sceneId: number;
  storyId: number;
  sceneOrder: number;
  imageUrl: string | null;
  sceneDescription: string;
  characterName: string | null;
  characterOpening: string | null;
}

// ---------- 아래는 예전 제안안 (아직 목 내부 전용) ----------

export interface NarrationItem {
  sceneId: number;
  sceneOrder: number;
  text: string;
  imageUrl: string;
}

export interface ScenePayload {
  sceneId: number; // 항상 대화 장면 (character_name NOT NULL)
  sceneOrder: number;
  characterName: string;
  characterImageUrl: string;
  backgroundImageUrl: string;
  narration: NarrationItem[];
  characterOpening: string;
  characterClosing: string;
  maxTurns: number;
  currentChildTurnCount: number;
}

export interface SessionMessage {
  id: number;
  sceneId: number;
  speakerType: 'CHILD' | 'CHARACTER';
  text: string;
}


// ---------- 발화 (확정 — audioB64는 확정 시 optional 추가) ----------

export interface UtteranceRequest {
  sceneId: number;
  text: string;
  sttRawText: string;
}

export interface DetectedElement {
  type: ThinkingElement;
  evidence: string;
}

export interface UtteranceData {
  sessionId: number;
  sceneId: number;
  childMessageId: number;
  analysisResult: {
    childIntent: string;
    detectedElements: DetectedElement[];
    utteranceValidity: UtteranceValidity;
  };
  progressResult: {
    mode: ProgressMode;
    accumulatedElements: ThinkingElement[];
    missingElements: ThinkingElement[];
  };
  characterMessage: {
    messageId: number;
    text: string;
    isClosing: boolean;
  };
  sceneCompleted: boolean;
  nextSceneId: number | null;
  showMission: boolean;
}

// ---------- 음성 (확정) ----------

export interface SttData {
  text: string;
  sttRawText: string;
}

// POST /speech/tts 응답은 봉투 없는 audio/mpeg 바이너리

// ---------- 리포트 ----------

/** 카테고리별 탐지 현황. 비율은 화면에서 계산한다 (백엔드 record 의 rate() 는 JSON 에 없다) */
export interface CategoryScore {
  detected: ThinkingElement[];
  total: number;
}

export interface ReportData {
  sessionId: number;
  storyTitle: string;
  completedAt: string;
  elementSummary: {
    accumulated: ThinkingElement[];
    totalRequired: number;
    /** 0~1 비율 (백분율이 아니다) */
    achievementRate: number;
    logic: CategoryScore;
    empathy: CategoryScore;
    perspective: CategoryScore;
  };
  scenes: {
    sceneOrder: number;
    characterName: string;
    turnCount: number;
    endReason: string;
    detectedElements: ThinkingElement[];
  }[];
  representativeUtterances: {
    sceneOrder: number;
    text: string;
    elements: ThinkingElement[];
  }[];
  learningGuide: {
    summary: string;
    strengthElements: ThinkingElement[];
    growthElements: ThinkingElement[];
  };
}

// ---------- 말하기 후 활동 ----------

/** 카드 id(card_1 …)는 정답 순서를 그대로 담고 있다 — 화면에 노출하지 않는다 */
export interface ActivityCard {
  id: string;
  text: string;
}

/** POST /sessions/{id}/activity — 서버가 섞은 카드를 준다 */
export interface ActivityCardSet {
  activityId: number;
  sessionId: number;
  cards: ActivityCard[];
}

/** PATCH /sessions/{id}/activity — submittedOrder 는 다시 말하기 제출 때도 함께 보낸다 */
export interface ActivitySubmitRequest {
  submittedOrder: string[];
  reconstructionText?: string;
}

export interface ActivityResult {
  activityId: number;
  sessionId: number;
  orderCorrect: boolean;
  /** 정답일 때만 채워진다. 오답이면 빈 배열 */
  retellingKeywords: string[];
  reconstructionText: string | null;
  /**
   * 주의: 첫 PATCH(순서 제출)에서 이미 true 가 된다.
   * "다시 말하기까지 끝났다"는 신호로 쓰면 안 된다 — 화면은 orderCorrect 로 판단한다
   */
  completed: boolean;
  completedAt: string | null;
}
