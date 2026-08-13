// 로그인·회원가입 화면 — MSW 목 기준 스펙.
// 실백엔드 확인은 .env.local 에 NEXT_PUBLIC_API_BASE_URL 을 넣고 수동으로 한다.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

// Next 라우트 안내자(#__next-route-announcer__)도 role="alert" 라서 폼 내부로 범위를 좁힌다
const formAlert = (page: Page) => page.locator('form [role="alert"]');

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
});

test('미로그인 상태로 루트에 오면 로그인 화면으로 보낸다', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
});

test('보호된 화면은 로그인 화면으로 되돌린다', async ({ page }) => {
  await page.goto('/home');
  await page.waitForURL('**/login');
});

test('클라이언트 검증이 잘못된 입력을 먼저 막는다', async ({ page }) => {
  // 백엔드는 검증 실패를 500으로 돌려주므로 요청 자체가 나가면 안 된다
  await page.goto('/signup');
  let requested = false;
  await page.route('**/api/auth/signup', (route) => {
    requested = true;
    return route.continue();
  });

  await page.getByLabel('이메일').fill('not-an-email');
  await page.getByLabel('보호자 이름').fill('테스트');
  await page.getByLabel('비밀번호').fill('123');
  await page.getByRole('button', { name: '회원가입' }).click();

  await expect(formAlert(page)).toHaveText(['이메일 형식이 올바르지 않아요.', '비밀번호는 8자 이상이어야 해요.']);
  expect(requested).toBe(false);
  await expect(page).toHaveURL(/\/signup/);
});

test('로그인 성공 시 홈으로 이동하고 새로고침해도 유지된다', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();

  await page.waitForURL('**/home');
  await expect(page.getByRole('heading', { name: '등록된 아이' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '등록된 아이' })).toBeVisible();
  await expect(page).toHaveURL(/\/home/);
});

test('비밀번호가 틀리면 안내 문구를 보여준다', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill('wrongpassword');
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(formAlert(page).first()).toHaveText('이메일 또는 비밀번호를 확인해 주세요.');
  await expect(page).toHaveURL(/\/login/);
});

test('이미 가입된 이메일이면 안내 문구를 보여준다', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('보호자 이름').fill('중복');
  await page.getByLabel('비밀번호').fill('test1234!');
  await page.getByRole('button', { name: '회원가입' }).click();

  await expect(formAlert(page).first()).toHaveText('이미 가입된 이메일이에요.');
});

test('로그아웃하면 토큰이 지워지고 로그인 화면으로 돌아간다', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/home');

  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.waitForURL('**/login');
  expect(await page.evaluate(() => localStorage.getItem('gq:accessToken'))).toBeNull();
});

/*
 * 계정 전환 시 데이터가 새지 않아야 한다.
 * 로그아웃은 토큰만 지웠고 staleTime(30초) 안에는 재조회를 안 해서,
 * 두 번째 계정 홈에 첫 계정의 아이와 이어하기가 그대로 보였다.
 */
test('계정을 바꾸면 앞 계정의 아이가 보이지 않는다', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인' }).waitFor();
  await page.evaluate(() => {
    localStorage.clear();
    window.__gqMock?.resetMockState();
  });

  // 계정 A — 시드 보호자에게는 아이 "문열" 이 있다
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/home');
  await expect(page.getByText('문열')).toBeVisible();

  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.waitForURL('**/login');

  // 계정 B — 새로 가입한 계정이라 아이가 없다
  await page.getByRole('link', { name: /회원가입/ }).click();
  await page.waitForURL('**/signup');
  await page.getByLabel('이메일').fill(`switch${Date.now()}@test.com`);
  await page.getByLabel('보호자 이름').fill('둘째보호자');
  await page.getByLabel('비밀번호', { exact: true }).fill('test1234!');
  const confirm = page.getByLabel(/비밀번호 확인/);
  if (await confirm.count()) await confirm.fill('test1234!');
  await page.getByRole('button', { name: '회원가입' }).click();
  // 여기서 page.goto 를 쓰면 안 된다 — 전체 새로고침이라 캐시가 어차피 비워져
  // 이 테스트가 아무것도 검증하지 못한다. 가입은 client-side 로 /home 으로 이동한다
  await page.waitForURL('**/home');

  // 앞 계정의 아이도, 이어하기도 남아 있으면 안 된다
  await expect(page.getByText('문열')).toBeHidden();
  await expect(page.getByText('아직 등록된 아이가 없어요.')).toBeVisible();
  await expect(page.getByText('방귀 뀌는 며느리')).toBeHidden();
});
