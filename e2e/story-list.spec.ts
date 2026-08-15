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
  await expect(page.getByRole('heading', { name: '이야기', exact: true })).toBeVisible();
});

test('탭 4개가 모두 열려 있고 현재 위치를 표시한다', async ({ page }) => {
  await login(page);
  await page.goto('/stories');
  await expect(page.getByTestId('story-list')).toBeVisible();

  await expect(tabs(page).getByRole('listitem')).toHaveCount(4);
  await expect(tabs(page).getByRole('link')).toHaveCount(4);
  await expect(tabs(page).getByRole('link', { name: '이야기' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // 단어장은 아직 모은 단어가 없다 — 시안의 빈 상태
  await tabs(page).getByRole('link', { name: '단어장' }).click();
  await page.waitForURL('**/words');
  await expect(page.getByText('아직 모은 단어가 없어요!')).toBeVisible();
  await expect(page.getByRole('link', { name: '이야기 보러 가기' })).toBeVisible();

  // 마이페이지 → 프로필 카드 + 내 활동 기록 + 성장 레이더(기록이 없어도 8각형은 그린다)
  await tabs(page).getByRole('link', { name: '마이페이지' }).click();
  await page.waitForURL('**/me');
  await expect(page.getByRole('link', { name: '아이 정보 수정' })).toBeVisible();
  await expect(page.getByRole('img', { name: /사고 요소 성장 그래프/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /내 활동 기록/ })).toBeVisible();
  await page.getByRole('link', { name: /내 활동 기록/ }).click();
  await page.waitForURL('**/me/history');
  await expect(page.getByText('내가 끝낸 이야기를 다시 볼 수 있어요.')).toBeVisible();
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
