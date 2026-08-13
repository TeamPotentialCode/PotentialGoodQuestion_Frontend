// STORY-01 이야기 목록 + 하단 탭 — MSW 목 기준.
// 목에는 이야기가 `방귀 뀌는 며느리` 하나뿐이다(실백엔드 시드도 같다).
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인' }).waitFor();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.__gqMock?.resetMockState();
  });
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호').fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/home');
}

const tabs = (page: Page) => page.getByRole('navigation', { name: '주요 메뉴' });

test('홈 하단 탭에서 이야기로 이동한다', async ({ page }) => {
  await login(page);

  await expect(tabs(page)).toBeVisible();
  await tabs(page).getByRole('link', { name: '이야기' }).click();
  await page.waitForURL('**/stories');
  await expect(page.getByRole('heading', { name: '이야기' })).toBeVisible();
});

test('탭은 홈·이야기 둘뿐이고 현재 위치를 표시한다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');
  await expect(page.getByTestId('story-list')).toBeVisible();

  await expect(tabs(page).getByRole('link')).toHaveCount(2);
  // 화면이 없는 탭은 넣지 않았다
  await expect(tabs(page).getByRole('link', { name: '단어장' })).toHaveCount(0);
  await expect(tabs(page).getByRole('link', { name: '마이페이지' })).toHaveCount(0);
  await expect(tabs(page).getByRole('link', { name: '이야기' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('카드에 제목·시간·난이도·주제가 보이고 가짜 카드는 없다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');

  const cards = page.getByRole('link', { name: /방귀 뀌는 며느리/ });
  await expect(cards).toHaveCount(1);
  await expect(page.getByText('시간: 15분')).toBeVisible();
  await expect(page.getByText(/난이도: 보통/)).toBeVisible();
  // 시안의 "준비 중" 카드는 실제 데이터가 아니라서 넣지 않았다
  await expect(page.getByText('준비 중')).toHaveCount(0);
  await expect(page.getByText('새로운 이야기')).toHaveCount(0);
});

test('주제 필터로 목록이 걸러진다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');
  await expect(page.getByTestId('story-list')).toBeVisible();

  // 칩은 받아온 이야기의 주제로 만들어진다
  const filter = page.getByRole('list', { name: '주제 필터' });
  await expect(filter.getByRole('button', { name: '전체' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(filter.getByRole('button', { name: '다름' })).toBeVisible();

  await filter.getByRole('button', { name: '다름' }).click();
  await expect(filter.getByRole('button', { name: '다름' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('link', { name: /방귀 뀌는 며느리/ })).toHaveCount(1);

  await filter.getByRole('button', { name: '전체' }).click();
  await expect(page.getByRole('link', { name: /방귀 뀌는 며느리/ })).toHaveCount(1);
});

test('카드를 누르면 이야기 상세로 간다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).click();
  await page.waitForURL('**/stories/1');
  await expect(page.getByRole('heading', { name: '아이의 역할' })).toBeVisible();
});
