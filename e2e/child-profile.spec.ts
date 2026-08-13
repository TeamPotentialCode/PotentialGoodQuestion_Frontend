// 아이 프로필 등록 화면 — MSW 목 기준 스펙.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };


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
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  // 로그인 다음은 아이 선택 화면이다(CHILD-01)
  await page.waitForURL('**/children');
  if (withoutChildren) return; // 고를 아이가 없으면 여기서 멈춘다 — 시작 버튼이 비활성이다
  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
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

  // 아이 선택 화면에서 바로 추가로 간다
  await page.getByRole('link', { name: '아이 추가' }).click();
  await page.waitForURL('**/children/new');

  await expect(page.getByRole('heading', { name: '아이 정보를 알려 주세요' })).toBeVisible();
  await page.getByLabel('아이 이름').fill('하늘');
  await page.getByRole('button', { name: '7세' }).click();
  await page.getByRole('button', { name: '등록하기' }).click();

  // 등록이 끝나면 아이 선택 화면으로 돌아오고 목록에 보인다
  await page.waitForURL('**/children');
  await expect(page.getByRole('listitem').filter({ hasText: '하늘' })).toBeVisible();

  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
  await page.waitForURL('**/home');
  // 상단 바의 아이 칩에 이름이 뜬다
  await expect(page.getByRole('button', { name: /하늘/ })).toBeVisible();
  // 등록된 뒤에도 아이 관리 화면으로 돌아갈 수 있어야 한다 (상단 바 메뉴 안)
  await page.getByRole('button', { name: /하늘/ }).click();
  await expect(page.getByRole('link', { name: '아이 관리' })).toBeVisible();
});

test('이름 없이 등록하면 요청을 보내기 전에 막는다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });
  await page.getByRole('link', { name: '아이 추가' }).click();
  await page.waitForURL('**/children/new');

  // 백엔드는 검증 위반을 400 이 아니라 500 으로 돌려주므로 요청 자체가 나가면 안 된다
  let posted = false;
  await page.route('**/api/children', (route) => {
    if (route.request().method() === 'POST') posted = true;
    return route.continue();
  });

  // 나이만 고르고 이름은 비운 채 제출한다
  await page.getByRole('button', { name: '7세' }).click();
  await page.getByRole('button', { name: '등록하기' }).click();

  await expect(page.getByText('아이 이름을 입력해 주세요.')).toBeVisible();
  expect(posted).toBe(false);
  await expect(page).toHaveURL(/\/children\/new/);
});

test('나이를 안 고르면 요청을 보내지 않는다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });
  await page.getByRole('link', { name: '아이 추가' }).click();
  await page.waitForURL('**/children/new');

  let posted = false;
  await page.route('**/api/children', (route) => {
    if (route.request().method() === 'POST') posted = true;
    return route.continue();
  });

  await page.getByLabel('아이 이름').fill('하늘');
  await page.getByRole('button', { name: '등록하기' }).click();

  await expect(page.getByText('나이를 숫자로 입력해 주세요.')).toBeVisible();
  expect(posted).toBe(false);
});

test('정원이 차면 서버 응답을 그대로 보여준다', async ({ page }) => {
  // 등록 가능 인원은 백엔드만 안다. 프론트는 400 을 받고 나서야 안다
  await startFresh(page); // 시드 아이 1명이 있는 상태
  await page.getByRole('button', { name: /문열/ }).click();
  await page.getByRole('link', { name: '아이 관리' }).click();
  await page.waitForURL('**/children');

  await page.getByRole('link', { name: '아이 추가' }).click();
  await page.waitForURL('**/children/new');
  await page.getByLabel('아이 이름').fill('둘째');
  await page.getByRole('button', { name: '6세' }).click();
  await page.getByRole('button', { name: '등록하기' }).click();

  await expect(page.getByText('등록 가능한 아이 수를 초과했습니다.')).toBeVisible();
});

test('등록된 아이를 수정하면 선택 화면에 반영된다', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: /문열/ }).click();
  await page.getByRole('link', { name: '아이 관리' }).click();
  await page.waitForURL('**/children');

  await page.getByRole('link', { name: /정보 수정/ }).click();
  await page.waitForURL(/\/children\/\d+\/edit/);

  // 기존 값이 채워진 채로 열린다
  await expect(page.getByLabel('아이 이름')).not.toHaveValue('');
  await page.getByLabel('아이 이름').fill('바다');
  await page.getByRole('button', { name: '9세' }).click();
  await page.getByRole('button', { name: '수정하기' }).click();

  await page.waitForURL('**/children');
  await expect(page.getByRole('listitem').filter({ hasText: '바다' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '9세' })).toBeVisible();
});

test('수정 중 취소하면 원래 값이 남는다', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: /문열/ }).click();
  await page.getByRole('link', { name: '아이 관리' }).click();
  await page.waitForURL('**/children');

  await page.getByRole('link', { name: /정보 수정/ }).click();
  await page.waitForURL(/\/children\/\d+\/edit/);
  await page.getByLabel('아이 이름').fill('바뀌면안됨');
  await page.getByRole('link', { name: '취소' }).click();

  await page.waitForURL('**/children');
  await expect(page.getByRole('listitem').filter({ hasText: '문열' })).toBeVisible();
  await expect(page.getByText('바뀌면안됨')).toBeHidden();
});
