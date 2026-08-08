// 백엔드 API 계약 타입 — 목(mocks)과 client.ts가 공유하는 단일 정의.
// 확정 계약: 인증, utterances·stt·tts·reports
// 나머지(home/stories/sessions/사후활동)는 백엔드 확정 시 여기만 수정한다.

// 공통 응답 봉투. code 위치는 미확정 — 백엔드가 메시지에 넣으면 code는 undefined로 온다
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

export interface Child {
  id: number;
  name: string;
  birthYear: number;
  avatarKey: string;
}

// ---------- 이야기 ----------

export interface StoryCard {
  id: number;
  title: string;
  summary: string;
  difficulty: string;
  topics: string[];
  estimatedMinutes: number;
  thumbnailUrl: string;
  status: string;
}

export interface PostActivityCard {
  id: number;
  text: string;
  imageUrl: string;
}

export interface StoryDetail extends StoryCard {
  intro: string;
  childRole: string;
  sceneCount: number;
  activeSession: { sessionId: number } | null;
  postActivity: { cards: PostActivityCard[]; keywordCount: number };
}

// ---------- 홈 ----------

export interface HomeData {
  inProgress: {
    sessionId: number;
    storyId: number;
    storyTitle: string;
    thumbnailUrl: string;
    currentSceneOrder: number;
    totalScenes: number;
  } | null;
  recommended: StoryCard[];
}

// ---------- 장면·세션 ----------

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

export interface SessionDetail {
  sessionId: number;
  storyId: number;
  storyTitle: string;
  status: SessionStatus;
  scene: ScenePayload;
  messages: SessionMessage[];
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

export interface ReportData {
  sessionId: number;
  storyTitle: string;
  completedAt: string;
  elementSummary: {
    accumulated: ThinkingElement[];
    achievementRate: number;
    logic: number;
    empathy: number;
    perspective: number;
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

export interface PostOrderRequest {
  cardOrder: number[];
}

export interface PostOrderData {
  correct: boolean;
  keywords: string[];
}

export interface PostRetellingRequest {
  text: string;
  sttRawText: string;
}

export interface PostRetellingData {
  completed: boolean;
}
