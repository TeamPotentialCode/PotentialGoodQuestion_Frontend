// 상태 있는 목 세션 엔진 — 백엔드 발화 파이프라인(분석→후처리→진행판단→대사)을
// LLM 없이 결정적으로 재현한다. 목만으로 4개 대화 장면 완주가 가능해야 한다.
// 규칙 출처: team-notice-20260808의 ProgressJudgeEngine 조건 4단계.
import type {
  DetectedElement,
  ReportData,
  ScenePayload,
  SessionMessage,
  ProgressMode,
  ThinkingElement,
  UtteranceData,
  UtteranceRequest,
  UtteranceValidity,
} from '@/core/api/types';
import {
  ALL_SCENES,
  DIALOGUE_SCENES,
  ELEMENT_KEYWORDS,
  SUGGESTED_UTTERANCES,
  MOCK_STORY,
  withChildName,
  type MockDialogueScene,
} from '@/mocks/fixtures/story';

export const MOCK_CHILD_NAME = '문열';

interface SceneResult {
  sceneOrder: number;
  // 내레이션 장면은 캐릭터가 없고, 아직 안 끝난 장면은 종료 사유가 없다 (실백엔드와 동일)
  characterName: string | null;
  turnCount: number;
  endReason: string | null;
  detectedElements: ThinkingElement[];
}

export interface MockSession {
  sessionId: number;
  storyId: number;
  childId: number;
  sceneIndex: number; // DIALOGUE_SCENES 인덱스
  turnCount: number;
  accumulated: Set<ThinkingElement>;
  lowInfoStreak: number;
  noNewElementStreak: number;
  lastMode: ProgressMode;
  status: 'IN_PROGRESS' | 'COMPLETED';
  messages: SessionMessage[];
  perSceneResults: SceneResult[];
}

let nextSessionId = 1;
let nextMessageId = 1;
const sessions = new Map<number, MockSession>();
const idempotencyCache = new Map<string, UtteranceData>();

/*
 * MSW 는 페이지 안에서 돌기 때문에 새로고침하면 이 모듈이 통째로 다시 로드된다.
 * 세션을 메모리에만 두면 새로고침 한 번에 진행 중인 이야기가 사라져서
 * 실백엔드와 다르게 동작한다 — localStorage 에 실어 나른다.
 * accumulated 는 Set 이라 배열로 바꿔 저장한다.
 */
const STORE_KEY = 'gq:msw:sessions';

type StoredSession = Omit<MockSession, 'accumulated'> & { accumulated: ThinkingElement[] };

function persist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload = {
      nextSessionId,
      nextMessageId,
      sessions: [...sessions.values()].map<StoredSession>((s) => ({
        ...s,
        accumulated: [...s.accumulated],
      })),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch {
    // 저장이 막혀 있으면 메모리로만 동작한다 (노드 테스트 등)
  }
}

function restore(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as {
      nextSessionId: number;
      nextMessageId: number;
      sessions: StoredSession[];
    };
    nextSessionId = payload.nextSessionId;
    nextMessageId = payload.nextMessageId;
    for (const s of payload.sessions) {
      sessions.set(s.sessionId, { ...s, accumulated: new Set(s.accumulated) });
    }
  } catch {
    localStorage.removeItem(STORE_KEY);
  }
}

restore();

function currentScene(session: MockSession): MockDialogueScene {
  return DIALOGUE_SCENES[Math.min(session.sceneIndex, DIALOGUE_SCENES.length - 1)];
}

export function createSession(
  storyId: number,
  childId: number,
): { sessionId: number; scene: ScenePayload; reused: boolean } {
  const existing = [...sessions.values()].find(
    (s) => s.childId === childId && s.status === 'IN_PROGRESS',
  );
  if (existing) {
    return { sessionId: existing.sessionId, scene: buildScenePayload(existing), reused: true };
  }
  const session: MockSession = {
    sessionId: nextSessionId++,
    storyId,
    childId,
    sceneIndex: 0,
    turnCount: 0,
    accumulated: new Set(),
    lowInfoStreak: 0,
    noNewElementStreak: 0,
    lastMode: 'NORMAL',
    status: 'IN_PROGRESS',
    messages: [],
    perSceneResults: [],
  };
  sessions.set(session.sessionId, session);
  persist();
  return { sessionId: session.sessionId, scene: buildScenePayload(session), reused: false };
}

export function getSession(sessionId: number): MockSession | undefined {
  return sessions.get(sessionId);
}

/**
 * 진행 중인 최신 세션. childId 를 주면 그 아이 것만 본다 —
 * 안 그러면 계정을 바꿔도 앞 계정의 "이어하기" 가 홈에 그대로 뜬다
 */
export function activeSession(childId?: number): MockSession | undefined {
  return [...sessions.values()]
    .reverse()
    .find((s) => s.status === 'IN_PROGRESS' && (childId === undefined || s.childId === childId));
}

export function buildScenePayload(session: MockSession): ScenePayload {
  const scene = currentScene(session);
  return {
    sceneId: scene.sceneId,
    sceneOrder: scene.sceneOrder,
    characterName: scene.characterName,
    characterImageUrl: `/mock-assets/character-${scene.sceneOrder}.png`,
    backgroundImageUrl: `/mock-assets/bg-${scene.sceneOrder}.png`,
    narration: scene.narration,
    characterOpening: withChildName(scene.characterOpening, MOCK_CHILD_NAME),
    characterClosing: withChildName(scene.characterClosing, MOCK_CHILD_NAME),
    maxTurns: scene.maxTurns,
    currentChildTurnCount: session.turnCount,
  };
}

// 요소 탐지: 요소 코드 문자열 직접 입력(REASON 등) → 키워드 테이블 순.
// 같은 type 중복은 제거한다 (백엔드 PostProcessor 미러링)
function detectElements(text: string): DetectedElement[] {
  const found: DetectedElement[] = [];
  for (const element of Object.keys(ELEMENT_KEYWORDS) as ThinkingElement[]) {
    if (text.includes(element)) {
      found.push({ type: element, evidence: element });
      continue;
    }
    const keyword = ELEMENT_KEYWORDS[element].find((k) => text.includes(k));
    if (keyword) found.push({ type: element, evidence: keyword });
  }
  return found;
}

const GUIDANCE_NUDGE: Record<ThinkingElement, string> = {
  REASON: '왜 그런 건지 이유도 말해 줄래?',
  EMOTION: '그때 어떤 기분이었을지 말해 줄래?',
  PERSPECTIVE: '그 사람 마음이 어땠을지도 생각해 볼래?',
  SOLUTION: '어떻게 하면 좋을지 방법도 알려 줄래?',
  REQUEST: '누구에게 어떤 부탁을 하면 좋을까?',
  RESULT: '그러면 어떻게 될지도 말해 줄래?',
  DECISION: '너라면 어떻게 할지 정해서 말해 줄래?',
  EMPATHY: '따뜻한 위로의 말도 해 줄래?',
};

export function submitUtterance(
  sessionId: number,
  request: UtteranceRequest,
  idempotencyKey?: string | null,
): UtteranceData | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') return null;

  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) return cached; // 상태 변경 없이 기존 결과 반환
  }

  const scene = currentScene(session);
  const text = request.text.trim();
  const detected = detectElements(text);
  const validity: UtteranceValidity = text.length < 5 ? 'SHORT' : 'VALID';
  const newElements = detected.filter((d) => !session.accumulated.has(d.type));

  session.turnCount += 1;
  for (const d of detected) session.accumulated.add(d.type);
  session.lowInfoStreak = validity === 'SHORT' ? session.lowInfoStreak + 1 : 0;
  session.noNewElementStreak = newElements.length === 0 ? session.noNewElementStreak + 1 : 0;

  const childMessageId = nextMessageId++;
  session.messages.push({ id: childMessageId, sceneId: scene.sceneId, speakerType: 'CHILD', text });

  const missing = scene.requiredElements.filter((e) => !session.accumulated.has(e));
  // CLOSING 분기가 다음 장면을 위해 accumulated를 리셋하므로, 응답용 스냅샷을 먼저 뜬다
  const accumulatedSnapshot = [...session.accumulated];

  // ProgressJudge 조건 4단계 (팀 공지 흐름도 순서 그대로)
  let mode: ProgressMode;
  let endReason = '';
  if (missing.length === 0 && session.turnCount >= scene.preferredTurns) {
    mode = 'CLOSING';
    endReason = 'GOAL_MET';
  } else if (session.turnCount >= scene.maxTurns) {
    mode = 'CLOSING';
    endReason = 'MAX_TURNS';
  } else if (session.turnCount === 1 || newElements.length > 0 || session.lastMode === 'GUIDED') {
    mode = 'NORMAL';
  } else if (
    session.lowInfoStreak >= 2 ||
    session.noNewElementStreak >= 2 ||
    scene.maxTurns - session.turnCount <= 2
  ) {
    mode = 'GUIDED';
  } else {
    mode = 'NORMAL';
  }

  // 미션 노출 (설계문서 §12): has_mission 장면에서만.
  // 대화3(7): SOLUTION 탐지됐거나 2턴 경과 후에도 SOLUTION 없음 / 대화4(9): EMOTION·PERSPECTIVE 누적 시
  let showMission = false;
  if (scene.hasMission) {
    if (scene.sceneId === 7) {
      const hasSolution = session.accumulated.has('SOLUTION');
      showMission = hasSolution || (session.turnCount >= 2 && !hasSolution);
    } else {
      showMission = session.accumulated.has('EMOTION') || session.accumulated.has('PERSPECTIVE');
    }
  }

  let characterText: string;
  let sceneCompleted = false;
  let nextSceneId: number | null = scene.sceneId;
  if (mode === 'CLOSING') {
    characterText = withChildName(scene.characterClosing, MOCK_CHILD_NAME);
    sceneCompleted = true;
    session.perSceneResults.push({
      sceneOrder: scene.sceneOrder,
      characterName: scene.characterName,
      turnCount: session.turnCount,
      endReason,
      detectedElements: scene.requiredElements.filter((e) => session.accumulated.has(e)),
    });
    const isLast = session.sceneIndex >= DIALOGUE_SCENES.length - 1;
    nextSceneId = isLast ? null : DIALOGUE_SCENES[session.sceneIndex + 1].sceneId;
    if (isLast) {
      session.status = 'COMPLETED';
    } else {
      session.sceneIndex += 1;
      session.turnCount = 0;
      session.accumulated = new Set();
      session.lowInfoStreak = 0;
      session.noNewElementStreak = 0;
    }
  } else {
    const echo = text.length > 12 ? `${text.slice(0, 12)}…` : text;
    characterText =
      mode === 'GUIDED'
        ? `그랬구나. 그런데 궁금한 게 있어. ${GUIDANCE_NUDGE[missing[0] ?? 'REASON']}`
        : `그랬구나, "${echo}" 라고 생각했구나. 더 이야기해 줄래?`;
  }
  session.lastMode = mode;

  const characterMessageId = nextMessageId++;
  session.messages.push({
    id: characterMessageId,
    sceneId: scene.sceneId,
    speakerType: 'CHARACTER',
    text: characterText,
  });

  const result: UtteranceData = {
    sessionId,
    sceneId: scene.sceneId,
    childMessageId,
    analysisResult: {
      childIntent: validity === 'SHORT' ? '짧은 응답' : '자기 생각 표현',
      detectedElements: detected,
      utteranceValidity: validity,
    },
    progressResult: {
      mode,
      accumulatedElements: accumulatedSnapshot,
      missingElements: missing,
    },
    characterMessage: { messageId: characterMessageId, text: characterText, isClosing: mode === 'CLOSING' },
    sceneCompleted,
    nextSceneId: sceneCompleted ? nextSceneId : null,
    showMission,
  };
  if (idempotencyKey) idempotencyCache.set(idempotencyKey, result);
  persist(); // 턴 진행 상황도 새로고침을 견뎌야 한다
  return result;
}

// STT 목이 반환할 제안 발화 — 현재 씬의 턴 순서에 맞는 문장.
// 세션이 없으면 첫 씬의 첫 문장
export function nextSuggestedUtterance(): string {
  const session = activeSession();
  const scene = session ? currentScene(session) : DIALOGUE_SCENES[0];
  const list = SUGGESTED_UTTERANCES[scene.sceneId] ?? [];
  const index = Math.min(session?.turnCount ?? 0, list.length - 1);
  return list[index] ?? '재미있는 이야기였어요.';
}

const CATEGORY: Record<'logic' | 'empathy' | 'perspective', ThinkingElement[]> = {
  logic: ['REASON', 'DECISION', 'SOLUTION', 'RESULT'],
  empathy: ['EMOTION', 'EMPATHY'],
  perspective: ['PERSPECTIVE', 'REQUEST'],
};

export function buildReport(sessionId: number): ReportData | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const allDetected = session.perSceneResults.flatMap((r) => r.detectedElements);
  const accumulated = [...new Set(allDetected)];
  const totalRequired = DIALOGUE_SCENES.reduce((n, s) => n + s.requiredElements.length, 0);
  // 실백엔드는 카테고리별로 탐지된 요소 목록과 총 개수를 준다 (비율은 화면에서 계산한다)
  const score = (elements: ThinkingElement[]) => ({
    detected: [...new Set(allDetected.filter((e) => elements.includes(e)))],
    total: elements.length,
  });

  const childUtterances = session.messages.filter((m) => m.speakerType === 'CHILD');
  return {
    sessionId,
    storyTitle: MOCK_STORY.title,
    completedAt: session.status === 'COMPLETED' ? '2026-08-08T12:00:00Z' : null,
    elementSummary: {
      accumulated,
      totalRequired,
      // 실백엔드와 같이 0~1 비율로 준다 (백분율이 아니다)
      achievementRate: totalRequired === 0 ? 0 : accumulated.length / totalRequired,
      logic: score(CATEGORY.logic),
      empathy: score(CATEGORY.empathy),
      perspective: score(CATEGORY.perspective),
    },
    // 실백엔드는 내레이션 장면까지 전부 준다 — 아직 안 끝난 장면은 null 로 채운다
    scenes: ALL_SCENES.map((scene) => {
      const done = session.perSceneResults.find((r) => r.sceneOrder === scene.sceneOrder);
      return (
        done ?? {
          sceneOrder: scene.sceneOrder,
          characterName: scene.characterName,
          turnCount: 0,
          endReason: null,
          detectedElements: [],
        }
      );
    }),
    representativeUtterances: childUtterances.slice(0, 3).map((m) => ({
      sceneOrder: DIALOGUE_SCENES.find((s) => s.sceneId === m.sceneId)?.sceneOrder ?? 0,
      text: m.text,
      elements: detectElements(m.text).map((d) => d.type),
    })),
    learningGuide: {
      summary: `${MOCK_CHILD_NAME}는 인물의 마음을 헤아리는 말을 잘했어요. 이유를 묻는 대화를 이어가 보세요.`,
      strengthElements: accumulated.slice(0, 2),
      growthElements: (['REASON', 'RESULT'] as ThinkingElement[]).filter(
        (e) => !accumulated.includes(e),
      ),
    },
  };
}

export function resetMockState(): void {
  sessions.clear();
  idempotencyCache.clear();
  nextSessionId = 1;
  nextMessageId = 1;
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORE_KEY);
}
