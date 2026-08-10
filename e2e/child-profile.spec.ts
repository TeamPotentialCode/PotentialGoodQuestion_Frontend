// 아이 프로필 등록 화면 — MSW 목 기준 스펙.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

// Next 라우트 안내자(#__next-route-announcer__)도 role="alert" 라서 폼 내부로 범위를 좁힌다
const formAlert = (page: Page) => page.locator('form [role="alert"]');

/**
 * 목 상태는 페이지 컨텍스트의 모듈 변수라 전체 새로고침(goto)마다 시드로 되돌아간다.
 * 따라서 초기화한 뒤에는 goto 를 쓰지 않고 화면 안에서 이동한다.
 */
async function startFresh(page: Page, { withoutChildren = false } = {}) {
  await page.goto('/login');
  // MswProvider 는 worker.start() 가 끝나기 전까지 아무것도 그리지 않는다.
  // 폼이 보인다는 건 목이 준비됐다는 뜻 — 그 전에 __gqMock 을 부르면 조용히 무시된다
  await page.getByRole('button', { name: '로그인' }).waitFor();
  await page.evaluate((clear) => {
    localStorage.clear();
    window.__gqMock?.resetMockState();
    if (clear) window.__gqMock?.clearChildren();
  }, withoutChildren);

  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/home');
}

test('미로그인 상태로 아이 등록 화면에 오면 로그인으로 보낸다', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/children');
  await page.waitForURL('**/login');
});

test('아이가 없으면 등록 폼을 보여주고, 등록하면 목록과 홈에 반영된다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });

  await expect(page.getByText('아직 등록된 아이가 없어요.')).toBeVisible();
  await page.getByRole('link', { name: '아이 등록하기' }).click();
  await page.waitForURL('**/children');

  await expect(page.getByRole('heading', { name: '아이 관리' })).toBeVisible();
  await page.getByLabel('아이 이름').fill('하늘');
  await page.getByLabel('나이').fill('7');
  await page.getByRole('button', { name: '등록하기' }).click();

  // 화면에 머문 채 목록이 갱신되고, 입력은 비워져 연속 등록이 가능하다
  await expect(page.getByRole('heading', { name: '아이 관리' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '하늘' })).toBeVisible();
  await expect(page.getByLabel('아이 이름')).toHaveValue('');

  await page.getByRole('link', { name: '홈으로' }).click();
  await page.waitForURL('**/home');
  await expect(page.getByText('하늘', { exact: false })).toBeVisible();
  // 등록된 뒤에도 아이 관리 화면으로 돌아갈 수 있어야 한다
  await expect(page.getByRole('link', { name: '아이 관리' })).toBeVisible();
});

test('잘못된 입력은 요청을 보내기 전에 막는다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });
  await page.getByRole('link', { name: '아이 등록하기' }).click();
  await expect(page.getByRole('heading', { name: '아이 관리' })).toBeVisible();

  // 백엔드는 나이 범위 위반을 400이 아니라 500으로 돌려주므로 요청 자체가 나가면 안 된다
  let posted = false;
  await page.route('**/api/children', (route) => {
    if (route.request().method() === 'POST') posted = true;
    return route.continue();
  });

  await page.getByLabel('나이').fill('99');
  await page.getByRole('button', { name: '등록하기' }).click();

  await expect(formAlert(page)).toHaveText([
    '아이 이름을 입력해 주세요.',
    '나이는 20살 이하여야 해요.',
  ]);
  expect(posted).toBe(false);
  await expect(page).toHaveURL(/\/children/);
});

test('정원이 차면 서버 응답을 보고 폼을 접는다', async ({ page }) => {
  // 등록 가능 인원은 백엔드만 안다. 프론트는 400 을 받고 나서야 폼을 닫는다
  await startFresh(page); // 시드 아이 1명이 있는 상태
  await page.goto('/children');

  await expect(page.getByRole('heading', { name: '아이 관리' })).toBeVisible();
  // 정원을 모르는 시점에는 폼이 열려 있다
  await expect(page.getByRole('button', { name: '등록하기' })).toBeVisible();

  await page.getByLabel('아이 이름').fill('둘째');
  await page.getByLabel('나이').fill('5');
  await page.getByRole('button', { name: '등록하기' }).click();

  await expect(page.getByText('등록 가능한 아이 수를 초과했습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '등록하기' })).toBeHidden();
  await expect(page.getByRole('link', { name: '홈으로' })).toBeVisible();
});

test('등록된 아이를 수정하면 목록에 반영된다', async ({ page }) => {
  await startFresh(page); // 시드 아이 1명이 있는 상태
  await page.goto('/children');

  const item = page.getByRole('listitem').first();
  await item.getByRole('button', { name: /수정/ }).click();

  // 기존 값이 채워진 채로 편집 폼이 열린다
  await expect(page.getByLabel('아이 이름')).not.toHaveValue('');
  await page.getByLabel('아이 이름').fill('바다');
  await page.getByLabel('나이').fill('9');
  await page.getByRole('button', { name: '수정하기' }).click();

  // 편집 모드가 닫히고 목록에 새 값이 보인다
  await expect(page.getByRole('button', { name: '수정하기' })).toBeHidden();
  await expect(page.getByRole('listitem').filter({ hasText: '바다' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '만 9세' })).toBeVisible();
});

test('수정 중 취소하면 원래 값이 남는다', async ({ page }) => {
  await startFresh(page);
  await page.goto('/children');

  const before = await page.getByRole('listitem').first().innerText();
  await page.getByRole('listitem').first().getByRole('button', { name: /수정/ }).click();
  await page.getByLabel('아이 이름').fill('바뀌면안됨');
  await page.getByRole('button', { name: '취소' }).click();

  await expect(page.getByRole('button', { name: '수정하기' })).toBeHidden();
  expect(await page.getByRole('listitem').first().innerText()).toBe(before);
});

test('수정 폼도 잘못된 입력을 요청 전에 막는다', async ({ page }) => {
  await startFresh(page);
  await page.goto('/children');
  await page.getByRole('listitem').first().getByRole('button', { name: /수정/ }).click();

  let patched = false;
  await page.route('**/api/children/*', (route) => {
    if (route.request().method() === 'PATCH') patched = true;
    return route.continue();
  });

  await page.getByLabel('나이').fill('99');
  await page.getByRole('button', { name: '수정하기' }).click();

  await expect(formAlert(page).first()).toHaveText('나이는 20살 이하여야 해요.');
  expect(patched).toBe(false);
});
