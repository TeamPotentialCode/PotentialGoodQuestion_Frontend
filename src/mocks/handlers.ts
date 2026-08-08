// MSW 핸들러 — 확정 계약(인증·utterances·stt·tts·reports)
// 실백엔드가 /api prefix를 쓰므로 동일 경로로 등록한다. 오리진 무관(*) 매칭이라
// 브라우저(상대 경로)와 노드(절대 경로) 양쪽에서 동작한다.
import { delay, http, HttpResponse } from 'msw';
import type {
  ApiEnvelope,
  AuthTokens,
  Child,
  LoginRequest,
  PostOrderRequest,
  PostRetellingRequest,
  SignupRequest,
  StoryDetail,
  UtteranceRequest,
} from '@/core/api/types';
import {
  MOCK_STORY_DETAIL,
  MOCK_STORY,
  POST_KEYWORDS,
  POST_ORDER_ANSWER,
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
} from '@/mocks/session-store';

const api = (path: string) => `*/api${path}`;

function ok<T>(data: T, status = 200) {
  const body: ApiEnvelope<T> = { success: true, data, message: '요청이 성공했습니다.' };
  return HttpResponse.json(body, { status });
}

function fail(status: number, code: string, message: string) {
  const body: ApiEnvelope<null> = { success: false, data: null, message: `[${code}] ${message}`, code };
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

const users = new Map<string, MockUser>([
  ['demo@goodquestion.dev', { parentId: 1, email: 'demo@goodquestion.dev', password: 'demo1234!', name: '데모 보호자' }],
]);
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

const children: Child[] = [{ id: 1, name: MOCK_CHILD_NAME, birthYear: 2019, avatarKey: 'rabbit' }];
let nextChildId = 2;

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
    return requireAuth(request) ?? ok(children);
  }),

  http.post(api('/children'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    if (children.length >= 1) {
      return fail(409, 'CHILD_003', '등록 가능한 아이 수를 초과했습니다.'); // MVP 1명 제한
    }
    const body = (await request.json()) as Omit<Child, 'id'>;
    const child: Child = { id: nextChildId++, ...body };
    children.push(child);
    return ok(child, 201);
  }),

  http.patch(api('/children/:childId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const child = children.find((c) => c.id === Number(params.childId));
    if (!child) return fail(404, 'CHILD_001', '아이를 찾을 수 없습니다.');
    Object.assign(child, await request.json());
    return ok(child);
  }),

  // ---------- 홈 ----------
  http.get(api('/home'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const session = activeSession();
    return ok({
      inProgress: session
        ? {
            sessionId: session.sessionId,
            storyId: session.storyId,
            storyTitle: MOCK_STORY.title,
            thumbnailUrl: MOCK_STORY.thumbnailUrl,
            currentSceneOrder: buildScenePayload(session).sceneOrder,
            totalScenes: 4,
          }
        : null,
      recommended: [MOCK_STORY],
    });
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
    const session = activeSession();
    const detail: StoryDetail = {
      ...MOCK_STORY_DETAIL,
      activeSession: session ? { sessionId: session.sessionId } : null,
    };
    return ok(detail);
  }),

  http.post(api('/stories/:storyId/sessions'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const body = (await request.json()) as { childId: number };
    const { sessionId, scene } = createSession(Number(params.storyId), body.childId);
    return ok({ sessionId, scene }, 201);
  }),

  // ---------- 세션 ----------
  http.get(api('/sessions/:sessionId'), async ({ request, params }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const session = getSession(Number(params.sessionId));
    if (!session) return fail(404, 'SESSION_001', '세션을 찾을 수 없습니다.');
    return ok({
      sessionId: session.sessionId,
      storyId: session.storyId,
      storyTitle: MOCK_STORY.title,
      status: session.status,
      scene: buildScenePayload(session),
      messages: session.messages,
    });
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
  http.post(api('/sessions/:sessionId/post/order'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    const body = (await request.json()) as PostOrderRequest;
    const correct =
      body.cardOrder.length === POST_ORDER_ANSWER.length &&
      body.cardOrder.every((id, i) => id === POST_ORDER_ANSWER[i]);
    // FR-17: 정답 전에는 핵심 단어를 노출하지 않는다
    return ok({ correct, keywords: correct ? POST_KEYWORDS : [] });
  }),

  http.post(api('/sessions/:sessionId/post/retelling'), async ({ request }) => {
    await simulateLatency();
    const denied = requireAuth(request);
    if (denied) return denied;
    (await request.json()) as PostRetellingRequest;
    return ok({ completed: true });
  }),
];
