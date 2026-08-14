/* eslint-disable @typescript-eslint/no-explicit-any -- 임시 스펙: 응답 봉투를 느슨하게 다룬다 */
// 목 API 추가 케이스 검증(2차) — 확인 후 삭제하는 임시 스펙.
import { expect, test, type Page } from '@playwright/test';

interface ApiResult {
  status: number;
  contentType: string;
  bytes?: number;
  body?: any;
}

async function api(
  page: Page,
  path: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<ApiResult> {
  return page.evaluate(
    async ({ path: p, init: i }) => {
      const res = await fetch(`/api${p}`, i);
      const contentType = res.headers.get('Content-Type') ?? '';
      if (contentType.includes('audio/mpeg')) {
        const buf = await res.arrayBuffer();
        return { status: res.status, contentType, bytes: buf.byteLength };
      }
      return { status: res.status, contentType, body: await res.json() };
    },
    { path, init },
  );
}

function json(body: unknown, token?: string) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

async function ready(page: Page) {
  await page.goto('/dev');
  await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
}

async function login(page: Page): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await api(page, '/auth/login', json({ email: 'demo@goodquestion.dev', password: 'demo1234!' }));
  expect(res.status).toBe(200);
  return res.body.data;
}

function utter(page: Page, token: string, sessionId: number, text: string, idemKey?: string) {
  return api(page, `/sessions/${sessionId}/utterances`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(idemKey ? { 'Idempotency-Key': idemKey } : {}),
    },
    body: JSON.stringify({ sceneId: 0, text, sttRawText: text }),
  });
}

// 장면 하나를 아무말로 MAX_TURNS까지 소진해 다음 장면으로 넘긴다
async function burnScene(page: Page, token: string, sessionId: number, maxTurns: number) {
  for (let i = 0; i < maxTurns; i += 1) {
    const res = await utter(page, token, sessionId, '아무말');
    if (res.body.data.sceneCompleted) return;
  }
  throw new Error('장면이 닫히지 않았다');
}

test('analysis-fail-once: 500 후 같은 Idempotency-Key 재시도가 정상 처리된다', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  await page.evaluate(() => window.__gqMock?.setScenario('analysis-fail-once'));
  const failed = await utter(page, accessToken, sessionId, '며느리 입장에서는 속상했을 것 같아요.', 'retry-key');
  expect(failed.status).toBe(500);
  expect(failed.body.code).toBe('AI_001');

  // 실패 턴은 상태를 바꾸지 않았어야 한다
  const before = await api(page, `/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(before.body.data.currentChildTurnCount).toBe(0);

  // 같은 키로 재시도 (시나리오는 -once라 자동 복귀됨)
  const retried = await utter(page, accessToken, sessionId, '며느리 입장에서는 속상했을 것 같아요.', 'retry-key');
  expect(retried.status).toBe(200);
  expect(retried.body.data.progressResult.mode).toBe('NORMAL');

  const after = await api(page, `/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(after.body.data.currentChildTurnCount).toBe(1);
});

test('stt-fail-always: 복귀 없이 계속 500 (3연속 실패 흐름)', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  await page.evaluate(() => window.__gqMock?.setScenario('stt-fail-always'));

  const sttCall = () =>
    page.evaluate(async (token) => {
      const form = new FormData();
      form.append('audio', new Blob([new Uint8Array(8)]), 'v.webm');
      const res = await fetch('/api/speech/stt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      return res.status;
    }, accessToken);

  for (let i = 0; i < 3; i += 1) {
    expect(await sttCall()).toBe(500);
  }
  await page.evaluate(() => window.__gqMock?.resetScenario());
  expect(await sttCall()).toBe(200);
});

test('slow-network: utterances 응답이 8초가량 지연된다', async ({ page }) => {
  test.setTimeout(30_000);
  await ready(page);
  const { accessToken } = await login(page);
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  await page.evaluate(() => window.__gqMock?.setScenario('slow-network'));
  const started = Date.now();
  const res = await utter(page, accessToken, sessionId, '천천히 와도 괜찮아요.');
  const elapsed = Date.now() - started;
  expect(res.status).toBe(200);
  expect(elapsed).toBeGreaterThanOrEqual(7500);
  await page.evaluate(() => window.__gqMock?.resetScenario());
});

test('회원가입 정상 흐름: 201로 토큰 발급, 새 계정으로 로그인 가능', async ({ page }) => {
  await ready(page);
  const signed = await api(page, '/auth/signup', json({ email: 'new@gq.dev', password: 'pw1234!', name: '새보호자' }));
  expect(signed.status).toBe(201);
  expect(signed.body.data.accessToken.length).toBeGreaterThan(0);
  expect(signed.body.data.name).toBe('새보호자');

  const relogin = await api(page, '/auth/login', json({ email: 'new@gq.dev', password: 'pw1234!' }));
  expect(relogin.status).toBe(200);
  expect(relogin.body.data.parentId).toBe(signed.body.data.parentId);
});

test('홈 continueSession 생애주기: 없음 → 진행 중 표시 → 완주 후 다시 없음', async ({ page }) => {
  test.setTimeout(60_000);
  await ready(page);
  const { accessToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };

  const empty = await api(page, '/home?childId=1', { headers: auth });
  expect(empty.body.data.continueSession).toBeNull();
  expect(empty.body.data.recommendedStories).toHaveLength(1);

  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  const during = await api(page, '/home?childId=1', { headers: auth });
  expect(during.body.data.continueSession.sessionId).toBe(sessionId);
  expect(during.body.data.continueSession.currentSceneOrder).toBe(3);
  expect(during.body.data.continueSession.status).toBe('IN_PROGRESS');

  // 이야기 상세는 실백엔드와 같이 세션 정보를 포함하지 않는다
  const detail = await api(page, '/stories/1', { headers: auth });
  expect(detail.body.data.storyId).toBe(1);

  for (const maxTurns of [4, 5, 5, 4]) await burnScene(page, accessToken, sessionId, maxTurns);

  const done = await api(page, '/home?childId=1', { headers: auth });
  expect(done.body.data.continueSession).toBeNull();
});

test('세션 재사용: 진행 중 세션이 있으면 새로 만들지 않고 그대로 반환', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const first = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  await utter(page, accessToken, first.body.data.sessionId, '한 턴 진행한 상태');
  const second = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  expect(second.body.data.sessionId).toBe(first.body.data.sessionId);
  expect(second.body.data.currentChildTurnCount).toBe(1); // 진행 상태 유지
});

test('STT: 음성 파일 누락 시 400', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const status = await page.evaluate(async (token) => {
    const res = await fetch('/api/speech/stt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: new FormData(), // audio 필드 없음
    });
    return res.status;
  }, accessToken);
  expect(status).toBe(400);
});

test('GUIDED 유도: 저정보 반복 시 부족 요소 유도 질문이 붙는다', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  await utter(page, accessToken, sessionId, '아무말'); // 턴1: 첫 발화 NORMAL 강제
  const second = await utter(page, accessToken, sessionId, '아무말'); // 턴2: 저정보 2연속 → GUIDED
  expect(second.body.data.progressResult.mode).toBe('GUIDED');
  // 씬3 첫 부족 요소 PERSPECTIVE의 유도 문구
  expect(second.body.data.characterMessage.text).toContain('마음이 어땠을지');
});

test('showMission: 씬7은 2턴 경과·SOLUTION 조건, 씬9는 EMOTION/PERSPECTIVE 누적 조건', async ({ page }) => {
  test.setTimeout(60_000);
  await ready(page);
  const { accessToken } = await login(page);
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  // 씬3·씬5는 미션 없음 — 소진하며 showMission=false 확인
  const noMission = await utter(page, accessToken, sessionId, '아무말');
  expect(noMission.body.data.showMission).toBe(false);
  for (const maxTurns of [3, 5]) await burnScene(page, accessToken, sessionId, maxTurns);

  // 씬7 턴1 (SOLUTION 없음, 2턴 미만) → false
  const t1 = await utter(page, accessToken, sessionId, '아무말');
  expect(t1.body.data.sceneId).toBe(7);
  expect(t1.body.data.showMission).toBe(false);
  // 턴2 경과 → true
  const t2 = await utter(page, accessToken, sessionId, '아무말');
  expect(t2.body.data.showMission).toBe(true);
  await burnScene(page, accessToken, sessionId, 3);

  // 씬9: 감정/관점 없는 발화 → false, EMOTION 발화 → true
  const s9a = await utter(page, accessToken, sessionId, '아무말');
  expect(s9a.body.data.sceneId).toBe(9);
  expect(s9a.body.data.showMission).toBe(false);
  const s9b = await utter(page, accessToken, sessionId, '나도 정말 기뻐!');
  expect(s9b.body.data.showMission).toBe(true);
  // 어떤 미션인지도 함께 온다 — 화면이 붙을 때 이 값으로 분기한다
  expect(s9b.body.data.missionType).toBe('MISSION_2');
  expect(s9a.body.data.missionType).toBeNull();
});

test('사후 활동: 카드는 섞여 오고, 정답일 때만 핵심 단어가 온다', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  const set = await api(page, `/sessions/${sessionId}/activity`, json({}, accessToken));
  expect(set.status).toBe(200);
  const ids = set.body.data.cards.map((c: { id: string }) => c.id);
  expect(ids).toHaveLength(5);
  // 섞여서 온다 — 정답 순서 그대로 오면 활동이 성립하지 않는다
  expect(ids).not.toEqual(['card_1', 'card_2', 'card_3', 'card_4', 'card_5']);
  // id 는 정답을 담고 있으므로 화면이 아니라 여기서만 쓴다
  expect([...ids].sort()).toEqual(['card_1', 'card_2', 'card_3', 'card_4', 'card_5']);

  const patch = (body: Record<string, unknown>) =>
    api(page, `/sessions/${sessionId}/activity`, {
      ...json(body, accessToken),
      method: 'PATCH',
    });

  const wrong = await patch({ submittedOrder: ['card_2', 'card_1', 'card_3', 'card_4', 'card_5'] });
  expect(wrong.body.data.orderCorrect).toBe(false);
  expect(wrong.body.data.retellingKeywords).toEqual([]);

  const answer = ['card_1', 'card_2', 'card_3', 'card_4', 'card_5'];
  const right = await patch({ submittedOrder: answer });
  expect(right.body.data.orderCorrect).toBe(true);
  expect(right.body.data.retellingKeywords).toHaveLength(5);

  const retold = await patch({ submittedOrder: answer, reconstructionText: '며느리가 방귀를…' });
  expect(retold.body.data.reconstructionText).toBe('며느리가 방귀를…');
  expect(retold.body.data.completed).toBe(true);
});

test('터치 타겟 실측: 일반 48px 이상, 녹음 CTA 72px 이상', async ({ page }) => {
  await ready(page);
  const send = await page.getByRole('button', { name: '보내기 (48px)' }).boundingBox();
  expect(send).not.toBeNull();
  expect(send!.height).toBeGreaterThanOrEqual(48);

  const rerecord = await page.getByRole('button', { name: '다시 말하기 (56px)' }).boundingBox();
  expect(rerecord!.height).toBeGreaterThanOrEqual(56);

  const record = await page.getByRole('button', { name: '말하기', exact: true }).boundingBox();
  expect(record!.height).toBeGreaterThanOrEqual(72); // PRD 녹음 CTA 요건
  expect(record!.width).toBeGreaterThanOrEqual(72);
});
