// MSW 핸들러 — 확정 계약(인증·utterances·stt·tts·reports)
// 실백엔드가 /api prefix를 쓰므로 동일 경로로 등록한다. 오리진 무관(*) 매칭이라
// 브라우저(상대 경로)와 노드(절대 경로) 양쪽에서 동작한다.
import { delay, http, HttpResponse } from 'msw';
import type {
  ActivityCardSet,
  ActivityResult,
  ActivitySubmitRequest,
  ApiEnvelope,
  AuthTokens,
  Child,
  ChildUpsertRequest,
  ConsentInfo,
  ConsentRequest,
  HomeData,
  LoginRequest,
  SessionInfo,
  SignupRequest,
  UtteranceRequest,
} from '@/core/api/types';
import {
  ACTIVITY_CARDS,
  ACTIVITY_ORDER_ANSWER,
  ACTIVITY_SHUFFLED_ORDER,
  ALL_SCENES,
  MOCK_STORY_DETAIL,
  MOCK_STORY,
  RETELLING_KEYWORDS,
} from '@/mocks/fixtures/story';
import { silentMp3 } from '@/mocks/fixtures/silent-audio';
import { consumeScenario, getScenario } from '@/mocks/scenario';
import {
  activeSession,
  buildReport,
  buildScenePayload,
  createSession,
  getSession,
  MOCK_CHILD_NAME,
  nextSuggestedUtterance,
  submitUtterance,
  type MockSession,
} from '@/mocks/session-store';

const api = (path: string) => `*/api${path}`;

function ok<T>(data: T, status = 200) {
  const body: ApiEnvelope<T> = { success: true, data, message: '요청이 성공했습니다.' };
  return HttpResponse.json(body, { status });
}

// 실백엔드 에러 응답과 형태를 맞춘다: 메시지에 코드를 섞지 않는다.
// code 는 백엔드가 아직 내려주지 않지만, 추가될 때를 대비해 필드로만 둔다
function fail(status: number, code: string, message: string) {
  const body: ApiEnvelope<null> = { success: false, data: null, message, code };
  return HttpResponse.json(body, { status });
}

// 브라우저에서만 현실적인 지연을 흉내낸다 (노드 테스트는 즉시 응답)
async function simulateLatency(ms = 150): Promise<void> {
  if (typeof window !== 'undefined') await delay(ms);
}

// ---------- 인증 상태 (인메모리) ----------

interface MockUser {
  parentId: number;
  email: string;
  password: string;
  name: string;
}

const SEED_USER: MockUser = {
  parentId: 1,
  email: 'demo@goodquestion.dev',
  password: 'demo1234!',
  name: '데모 보호자',
};

const users = new Map<string, MockUser>([[SEED_USER.email, SEED_USER]]);
let nextParentId = 2;
let validRefreshToken = '';
let refreshRecovered = false; // expired-token 시나리오에서 refresh 성공 여부

function issueTokens(user: MockUser): AuthTokens {
  validRefreshToken = `mock-refresh-${user.parentId}-${validRefreshToken.length}`;
  return {
    accessToken: `mock-access-${user.parentId}`,
    refreshToken: validRefreshToken,
    parentId: user.parentId,
    name: user.name,
  };
}

function requireAuth(request: Request) {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return fail(401, 'AUTH_004', '유효하지 않은 토큰입니다.');
  }
  if (getScenario() === 'expired-token' && !refreshRecovered) {
    return fail(401, 'AUTH_005', '만료된 JWT 토큰입니다.');
  }
  return null;
}

// 실백엔드와 동일한 형태: 요청은 age, 응답은 birthYear + 서버가 계산한 age
const CURRENT_YEAR = 2026;
const seedChild = (): Child => ({
  childId: 1,
  name: MOCK_CHILD_NAME,
  birthYear: 2019,
  age: CURRENT_YEAR - 2019,
  createdAt: '2026-08-08T09:00:00',
});

// "아이 없음" 상태는 새로고침 뒤에도 유지돼야 한다(등록 화면을 여러 경로로 확인하므로).
// 목 상태는 페이지 모듈 변수라 리로드마다 초기화되므로, 시나리오 스위치와 같이 저장소에 기록한다
const NO_CHILDREN_KEY = 'gq:msw:noChildren';

function noChildrenFlag(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(NO_CHILDREN_KEY) === '1';
}

/*
 * 아이는 **보호자별로** 나눠 갖는다. 실백엔드가 그렇게 동작하고,
 * 전역 배열 하나로 두면 계정을 바꿔도 같은 아이가 보여서
 * "앞 계정 데이터가 새는지" 를 테스트로 확인할 수 없다.
 */
const childrenByParent = new Map<number, Child[]>();
// 아이당 유효한 동의는 하나. 철회하면 지운다(실백엔드는 withdrawnAt 을 채운다)
const consentsByChild = new Map<number, ConsentInfo>();
let nextConsentId = 1;
let nextChildId = 2;

/** 목 액세스 토큰은 mock-access-{parentId} 형태다 */
function parentIdOf(request: Request): number {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  return Number(token.replace('mock-access-', '')) || SEED_USER.parentId;
}

function childrenOf(parentId: number): Child[] {
  if (!childrenByParent.has(parentId)) {
    // 시드 보호자만 아이를 하나 갖고 시작한다. 새로 가입한 계정은 비어 있다
    const seeded = parentId === SEED_USER.parentId && !noChildrenFlag() ? [seedChild()] : [];
    childrenByParent.set(parentId, seeded);
  }
  return childrenByParent.get(parentId)!;
}

/** 인증·아이 상태를 시드로 되돌린다. 테스트 간 격리에 쓴다. */
export function resetApiState(): void {
  users.clear();
  users.set(SEED_USER.email, { ...SEED_USER });
  nextParentId = 2;
  validRefreshToken = '';
  refreshRecovered = false;
  if (typeof localStorage !== 'undefined') localStorage.removeItem(NO_CHILDREN_KEY);
  childrenByParent.clear();
  nextChildId = 2;
  consentsByChild.clear();
  nextConsentId = 1;
}

/** 아이 미등록 상태를 만든다(등록 화면 확인용). 새로고침해도 유지된다. */
export function clearChildren(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(NO_CHILDREN_KEY, '1');
  childrenByParent.clear();
  nextChildId = 2;
  consentsByChild.clear();
}

// 실백엔드 SessionInfo 와 같은 형태로 변환한다.
// 목 내부는 장면 페이로드를 들고 있지만 응답에는 currentSceneId 만 노출한다
function toSessionInfo(session: MockSession): SessionInfo {
  const child = [...childrenByParent.values()].flat().find((c) => c.childId === session.childId);
  return {
    sessionId: session.sessionId,
    storyId: session.storyId,
    storyTitle: MOCK_STORY.title,
    childId: session.childId,
    childName: child?.name ?? MOCK_CHILD_NAME,
    status: session.status,
    currentSceneId: buildScenePayload(session).sceneId,
    currentChildTurnCount: session.turnCount,
    startedAt: '2026-08-10T10:00:00',
    completedAt: session.status === 'COMPLETED' ? '2026-08-10T10:30:00' : null,
  };
}

export const handlers = [
  // ---------- 인증 (김현정 확정 계약) ----------
  http.post(api('/auth/signup'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as SignupRequest;
    if (users.has(body.email)) return fail(409, 'AUTH_001', '이미 사용 중인 이메일입니다.');
    const user: MockUser = { parentId: nextParentId++, ...body };
    users.set(user.email, user);
    return ok(issueTokens(user), 201);
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as LoginRequest;
    const user = users.get(body.email);
    if (!user || user.password !== body.password) {
      return fail(401, 'AUTH_002', '이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    return ok(issueTokens(user));
  }),

  http.post(api('/auth/refresh'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as { refreshToken: string };
    if (body.refreshToken !== validRefreshToken) {
      return fail(401, 'AUTH_006', 'Refresh Token이 일치하지 않습니다.');
    }
    refreshRecovered = true; // expired-token 시나리오 해제
    const user = [...users.values()][0];
    return ok(issueTokens(user)); // 토큰 회전 — 구 refreshToken은 무효화
  }),

  // ---------- 아이 프로필 ----------
  http.get(api('/children'), async ({ request }) => {
    await simulateLatency();
    return requireAuth(request) ?? ok(childrenOf(parentIdOf(request)));
  }),

  http.post(api('/children'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const mine = childrenOf(parentIdOf(request));
    // MVP 1명 제한. 실백엔드가 409가 아니라 400을 준다
    if (mine.length >= 1) {
      return fail(400, 'CHILD_003', '등록 가능한 아이 수를 초과했습니다.');
    }
    const body = (await request.json()) as ChildUpsertRequest;
    const child: Child = {
      childId: nextChildId++,
      name: body.name,
      // 요청은 birthYear, 응답은 birthYear + 서버가 계산한 age (실백엔드와 동일)
      birthYear: body.birthYear,
      age: CURRENT_YEAR - body.birthYear,
      createdAt: '2026-08-10T09:00:00',
    };
    mine.push(child);
    // 등록됐으니 "아이 없음" 상태를 해제한다
    if (typeof localStorage !== 'undefined') localStorage.removeItem(NO_CHILDREN_KEY);
    return ok(child, 201);
  }),

  http.patch(api('/children/:childId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const child = childrenOf(parentIdOf(request)).find((c) => c.childId === Number(params.childId));
    if (!child) return fail(404, 'CHILD_001', '아이를 찾을 수 없습니다.');
    const body = (await request.json()) as ChildUpsertRequest;
    child.name = body.name;
    child.birthYear = body.birthYear;
    child.age = CURRENT_YEAR - body.birthYear;
    return ok(child);
  }),

  // ---------- 아동 개인정보 처리 동의 ----------
  // 실백엔드는 유효한 동의가 없으면 404 를 준다 — 부르는 쪽이 "동의 없음"으로 읽는다
  http.post(api('/children/:childId/consent'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const childId = Number(params.childId);
    const child = childrenOf(parentIdOf(request)).find((c) => c.childId === childId);
    if (!child) return fail(404, 'CHILD_001', '아이를 찾을 수 없습니다.');
    const body = (await request.json()) as ConsentRequest;
    const info: ConsentInfo = {
      consentId: nextConsentId++,
      childId,
      consentVersion: body.consentVersion,
      verificationMethod: body.verificationMethod,
      consentedAt: '2026-08-14T09:00:00',
      active: true,
    };
    consentsByChild.set(childId, info);
    return ok(info, 201);
  }),

  http.get(api('/children/:childId/consent'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const info = consentsByChild.get(Number(params.childId));
    if (!info) return fail(404, 'CHILD_001', '유효한 동의가 없습니다.');
    return ok(info);
  }),

  http.delete(api('/children/:childId/consent'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    if (!consentsByChild.delete(Number(params.childId))) {
      return fail(404, 'CHILD_001', '유효한 동의가 없습니다.');
    }
    return ok(null);
  }),

  // ---------- 홈 ----------
  http.get(api('/home'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    // 실백엔드는 childId 를 필수 쿼리 파라미터로 요구한다
    const childId = new URL(request.url).searchParams.get('childId');
    if (!childId) return fail(400, 'HOME_001', '아이 ID는 필수입니다.');

    // 요청한 아이의 세션만 본다. 아이는 이미 보호자별로 나뉘어 있으므로 계정 경계도 함께 지켜진다
    const session = activeSession(Number(childId));
    const scene = session ? buildScenePayload(session) : null;
    const home: HomeData = {
      continueSession: session
        ? {
            sessionId: session.sessionId,
            storyId: session.storyId,
            storyTitle: MOCK_STORY.title,
            thumbnailUrl: MOCK_STORY.thumbnailUrl,
            currentSceneId: scene?.sceneId ?? null,
            currentSceneOrder: scene?.sceneOrder ?? null,
            status: 'IN_PROGRESS',
            lastActivityAt: '2026-08-10T10:00:00',
          }
        : null,
      recommendedStories: [MOCK_STORY],
    };
    return ok(home);
  }),

  // ---------- 이야기 ----------
  http.get(api('/stories'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const topic = new URL(request.url).searchParams.get('topic');
    const list = topic && !MOCK_STORY.topics.includes(topic) ? [] : [MOCK_STORY];
    return ok(list);
  }),

  http.get(api('/stories/:storyId'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    return ok(MOCK_STORY_DETAIL);
  }),

  // 장면 조회 — 실백엔드처럼 sceneId(PK)로만 가능하고 목록 API는 없다
  http.get(api('/stories/:storyId/scenes/:sceneId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const scene = ALL_SCENES.find((s) => s.sceneId === Number(params.sceneId));
    if (!scene) return fail(404, 'SCENE_001', '장면을 찾을 수 없습니다.');
    return ok(scene);
  }),

  http.post(api('/stories/:storyId/sessions'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const body = (await request.json()) as { childId: number };
    const { sessionId } = createSession(Number(params.storyId), body.childId);
    const session = getSession(sessionId);
    return ok(toSessionInfo(session!), 201);
  }),

  // ---------- 세션 ----------
  http.get(api('/sessions/:sessionId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const session = getSession(Number(params.sessionId));
    if (!session) return fail(404, 'SESSION_001', '세션을 찾을 수 없습니다.');
    return ok(toSessionInfo(session));
  }),

  http.post(api('/sessions/:sessionId/utterances'), async ({ request, params }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    if (consumeScenario('analysis-fail-once')) {
      return fail(500, 'AI_001', '발화 분석에 실패했습니다.');
    }
    await simulateLatency(getScenario() === 'slow-network' ? 8000 : 600);
    const body = (await request.json()) as UtteranceRequest;
    const result = submitUtterance(
      Number(params.sessionId),
      body,
      request.headers.get('Idempotency-Key'),
    );
    if (!result) return fail(400, 'SESSION_002', '진행 중인 세션이 아닙니다.');
    return ok(result);
  }),

  // ---------- 음성 ----------
  http.post(api('/speech/stt'), async ({ request }) => {
    await simulateLatency(800);
    const denied = requireAuth(request);
    if (denied) return denied;
    // 빈 multipart는 formData() 파싱 자체가 던지므로 파싱 실패도 400으로 취급한다
    const audio = await request
      .formData()
      .then((form) => form.get('audio'))
      .catch(() => null);
    if (!audio) return fail(400, 'AI_002', '음성 파일이 없습니다.');
    if (consumeScenario('stt-fail-once') || getScenario() === 'stt-fail-always') {
      return fail(500, 'AI_003', '음성 인식에 실패했습니다.');
    }
    if (getScenario() === 'stt-empty') return ok({ text: '', sttRawText: '' });
    const text = nextSuggestedUtterance();
    return ok({ text, sttRawText: text });
  }),

  // 확정 계약: 봉투 없는 audio/mpeg 바이너리 — client.ts가 Content-Type으로 분기해야 한다
  http.post(api('/speech/tts'), async ({ request }) => {
    await simulateLatency(400);
    const denied = requireAuth(request);
    if (denied) return denied;
    return HttpResponse.arrayBuffer(silentMp3().buffer as ArrayBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  }),

  // ---------- 리포트 ----------
  http.get(api('/reports/:sessionId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const report = buildReport(Number(params.sessionId));
    if (!report) return fail(404, 'SESSION_001', '세션을 찾을 수 없습니다.');
    return ok(report);
  }),

  // ---------- 말하기 후 활동 ----------
  // 시작: 카드를 섞어서 준다. 실백엔드는 무작위지만 목은 고정 순서다(E2E 가 결정적이어야 한다)
  http.post(api('/sessions/:sessionId/activity'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const sessionId = Number(params.sessionId);
    if (!getSession(sessionId)) return fail(404, 'SESSION_001', '세션을 찾을 수 없습니다.');

    const cards = ACTIVITY_SHUFFLED_ORDER.map(
      (id) => ACTIVITY_CARDS.find((card) => card.id === id)!,
    );
    return ok<ActivityCardSet>({ activityId: sessionId, sessionId, cards });
  }),

  // 제출: 순서 채점 + (선택) 재구성 텍스트 저장.
  // 실백엔드는 첫 제출에서 completed 를 true 로 만든다 — 그대로 흉내낸다
  http.patch(api('/sessions/:sessionId/activity'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const sessionId = Number(params.sessionId);
    if (!getSession(sessionId)) return fail(404, 'SESSION_001', '세션을 찾을 수 없습니다.');

    const body = (await request.json()) as ActivitySubmitRequest;
    const orderCorrect =
      body.submittedOrder.length === ACTIVITY_ORDER_ANSWER.length &&
      body.submittedOrder.every((id, i) => id === ACTIVITY_ORDER_ANSWER[i]);

    return ok<ActivityResult>({
      activityId: sessionId,
      sessionId,
      orderCorrect,
      // 정답 전에는 핵심 단어를 노출하지 않는다
      retellingKeywords: orderCorrect ? RETELLING_KEYWORDS : [],
      reconstructionText: body.reconstructionText ?? null,
      completed: true,
      completedAt: '2026-08-11T12:00:00Z',
    });
  }),
];
