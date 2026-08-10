/* eslint-disable @typescript-eslint/no-explicit-any -- 임시 스펙: 응답 봉투를 느슨하게 다룬다 */
// 목 API 케이스 검증 — 확인 후 삭제하는 임시 스펙.
// MSW는 페이지 컨텍스트에서 동작하므로 page.evaluate 안의 fetch로 핸들러를 직접 때린다.
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
  await expect(page.getByRole('button', { name: '로그인' })).toBeVisible(); // MSW 기동 완료
}

async function login(page: Page): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await api(page, '/auth/login', json({ email: 'demo@goodquestion.dev', password: 'demo1234!' }));
  expect(res.status).toBe(200);
  return res.body.data;
}

test('인증 실패: 비밀번호 불일치 401, 중복 가입 409, 토큰 없이 보호 라우트 401', async ({ page }) => {
  await ready(page);
  const bad = await api(page, '/auth/login', json({ email: 'demo@goodquestion.dev', password: 'wrong' }));
  expect(bad.status).toBe(401);
  expect(bad.body.code).toBe('AUTH_002');
  expect(bad.body.success).toBe(false);

  const dup = await api(page, '/auth/signup', json({ email: 'demo@goodquestion.dev', password: 'x', name: 'x' }));
  expect(dup.status).toBe(409);
  expect(dup.body.code).toBe('AUTH_001');

  const noToken = await api(page, '/children');
  expect(noToken.status).toBe(401);
  expect(noToken.body.code).toBe('AUTH_004');
});

test('refresh 회전: 새 토큰 발급 후 구 refreshToken 재사용은 401', async ({ page }) => {
  await ready(page);
  const first = await login(page);
  const rotated = await api(page, '/auth/refresh', json({ refreshToken: first.refreshToken }));
  expect(rotated.status).toBe(200);
  expect(rotated.body.data.refreshToken).not.toBe(first.refreshToken);

  const reuse = await api(page, '/auth/refresh', json({ refreshToken: first.refreshToken }));
  expect(reuse.status).toBe(401);
  expect(reuse.body.code).toBe('AUTH_006');
});

test('아이 프로필: 시드 1명 조회, 추가는 MVP 제한 409, 수정은 반영', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };

  const list = await api(page, '/children', { headers: auth });
  expect(list.body.data).toHaveLength(1);
  expect(list.body.data[0].name).toBe('문열');

  // 실백엔드도 400을 준다 (409 아님)
  const over = await api(page, '/children', json({ name: '둘째', age: 6 }, accessToken));
  expect(over.status).toBe(400);
  expect(over.body.success).toBe(false);

  const patched = await api(page, '/children/1', {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '문열이' }),
  });
  expect(patched.status).toBe(200);
  expect(patched.body.data.name).toBe('문열이');
});

test('이야기 필터·미존재 세션: topic 불일치는 빈 목록, 세션 404', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };

  const match = await api(page, '/stories?topic=다름', { headers: auth });
  expect(match.body.data).toHaveLength(1);
  const none = await api(page, '/stories?topic=우주', { headers: auth });
  expect(none.body.data).toHaveLength(0);

  const missing = await api(page, '/sessions/999', { headers: auth });
  expect(missing.status).toBe(404);
  expect(missing.body.code).toBe('SESSION_001');
});

test('Idempotency-Key: 같은 키 재전송은 상태 변경 없이 같은 응답', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  const send = () =>
    api(page, `/sessions/${sessionId}/utterances`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': 'turn-1' },
      body: JSON.stringify({ sceneId: 3, text: '며느리 입장에서는 참느라 정말 속상했을 것 같아요.', sttRawText: '' }),
    });
  const first = await send();
  const second = await send();
  expect(second.body.data.childMessageId).toBe(first.body.data.childMessageId);

  const detail = await api(page, `/sessions/${sessionId}`, { headers: auth });
  expect(detail.body.data.scene.currentChildTurnCount).toBe(1); // 턴이 중복 증가하지 않았다
});

test('세션 완주: 아무말만으로 MAX_TURNS 완료 후 추가 발화는 400', async ({ page }) => {
  test.setTimeout(60_000);
  await ready(page);
  const { accessToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };
  const created = await api(page, '/stories/1/sessions', json({ childId: 1 }, accessToken));
  const sessionId = created.body.data.sessionId;

  // maxTurns 합계 4+5+5+4 = 18턴이면 반드시 COMPLETED
  let completedAt = 0;
  for (let i = 1; i <= 18; i += 1) {
    const res = await api(page, `/sessions/${sessionId}/utterances`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneId: 0, text: '아무말', sttRawText: '' }),
    });
    if (res.body.data.sceneCompleted && res.body.data.nextSceneId === null) {
      completedAt = i;
      break;
    }
  }
  expect(completedAt).toBe(18);

  const detail = await api(page, `/sessions/${sessionId}`, { headers: auth });
  expect(detail.body.data.status).toBe('COMPLETED');

  const after = await api(page, `/sessions/${sessionId}/utterances`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId: 0, text: '아무말', sttRawText: '' }),
  });
  expect(after.status).toBe(400);
  expect(after.body.code).toBe('SESSION_002');

  const report = await api(page, `/reports/${sessionId}`, { headers: auth });
  expect(report.body.data.scenes).toHaveLength(4);
  expect(report.body.data.scenes.every((s: { endReason: string }) => s.endReason === 'MAX_TURNS')).toBe(true);
});

test('TTS: 봉투 없는 audio/mpeg 바이너리를 반환한다', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  const res = await api(page, '/speech/tts', json({ text: '안녕' }, accessToken));
  expect(res.status).toBe(200);
  expect(res.contentType).toContain('audio/mpeg');
  expect(res.bytes ?? 0).toBeGreaterThan(0);
});

test('stt-fail-once: 1회 500 후 자동으로 happy 복귀', async ({ page }) => {
  await ready(page);
  const { accessToken } = await login(page);
  await page.evaluate(() => window.__gqMock?.setScenario('stt-fail-once'));

  const sttCall = () =>
    page.evaluate(async (token) => {
      const form = new FormData();
      form.append('audio', new Blob([new Uint8Array(8)]), 'v.webm');
      const res = await fetch('/api/speech/stt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      return { status: res.status, body: await res.json() };
    }, accessToken);

  const first = await sttCall();
  expect(first.status).toBe(500);
  expect(first.body.code).toBe('AI_003');
  const second = await sttCall();
  expect(second.status).toBe(200);
  expect(second.body.data.text.length).toBeGreaterThan(0);
});

test('expired-token: 보호 라우트 401 → refresh 성공 → 다시 접근 가능', async ({ page }) => {
  await ready(page);
  const { accessToken, refreshToken } = await login(page);
  const auth = { Authorization: `Bearer ${accessToken}` };
  await page.evaluate(() => window.__gqMock?.setScenario('expired-token'));

  const denied = await api(page, '/home?childId=1', { headers: auth });
  expect(denied.status).toBe(401);
  expect(denied.body.code).toBe('AUTH_005');

  const refreshed = await api(page, '/auth/refresh', json({ refreshToken }));
  expect(refreshed.status).toBe(200);

  const allowed = await api(page, '/home?childId=1', {
    headers: { Authorization: `Bearer ${refreshed.body.data.accessToken}` },
  });
  expect(allowed.status).toBe(200);
  await page.evaluate(() => window.__gqMock?.resetScenario());
});
