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
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/children');
  // 로그인 다음은 아이 선택 화면이다(CHILD-01)
  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
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

test('탭은 4개이고 화면 없는 둘은 비활성이며 현재 위치를 표시한다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');
  await expect(page.getByTestId('story-list')).toBeVisible();

  // 시안대로 4칸이지만 화면이 없는 둘은 링크가 아니라 비활성 버튼이다
  await expect(tabs(page).getByRole('listitem')).toHaveCount(4);
  await expect(tabs(page).getByRole('link')).toHaveCount(2);
  await expect(tabs(page).getByRole('button', { name: '단어장' })).toBeDisabled();
  await expect(tabs(page).getByRole('button', { name: '마이페이지' })).toBeDisabled();
  await expect(tabs(page).getByRole('link', { name: '이야기' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('카드에 제목·시간·난이도·주제가 보이고 빈 자리는 "준비 중"이 메운다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');

  const cards = page.getByRole('link', { name: /방귀 뀌는 며느리/ });
  await expect(cards).toHaveCount(1);
  // 자리표시 카드에도 "시간: 15분" 이 있으므로 진짜 카드 안에서 본다
  await expect(cards.getByText('시간: 15분')).toBeVisible();
  await expect(cards.getByText(/난이도: 보통/)).toBeVisible();
  // 시안 v4 는 목록을 3장으로 채워 둔다. 자리표시 카드는 누를 수 없어야 한다
  await expect(page.getByText('새로운 이야기')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /새로운 이야기/ })).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: '이 이야기에서 너는?' })).toBeVisible();
});
