// 홈 화면 — MSW 목 기준 스펙.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

/**
 * 목 상태는 페이지 컨텍스트의 모듈 변수라 전체 새로고침마다 시드로 되돌아간다.
 * 초기화한 뒤에는 goto 를 쓰지 않고 화면 안에서 이동한다.
 */
async function startFresh(page: Page, { withoutChildren = false } = {}) {
  await page.goto('/login');
  // MswProvider 는 worker.start() 가 끝나기 전까지 아무것도 그리지 않는다
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

test('아이가 없으면 등록 안내만 보이고 이야기 영역은 그리지 않는다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });

  await expect(page.getByText('아직 등록된 아이가 없어요.')).toBeVisible();
  await expect(page.getByRole('link', { name: '아이 등록하기' })).toBeVisible();
  // 아이가 없으면 홈 조회 자체를 하지 않는다
  await expect(page.getByRole('heading', { name: '추천 이야기' })).toBeHidden();
  await expect(page.getByRole('heading', { name: '이어하기' })).toBeHidden();
});

test('아이가 있으면 이어하기 없음과 추천 이야기를 보여준다', async ({ page }) => {
  await startFresh(page);

  await expect(page.getByRole('heading', { name: '이어하기' })).toBeVisible();
  await expect(page.getByText('진행 중인 이야기가 없어요.')).toBeVisible();

  await expect(page.getByRole('heading', { name: '추천 이야기' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '방귀 뀌는 며느리' })).toBeVisible();
  await expect(page.getByText('보통 · 약 15분')).toBeVisible();
});

test('진행 중 세션이 있으면 이어하기 카드가 뜬다', async ({ page }) => {
  await startFresh(page);

  // 목에 세션을 하나 만들고 홈을 다시 조회한다 (전체 새로고침은 목 상태를 되돌리므로 쓰지 않는다)
  await page.evaluate(async () => {
    await fetch('/api/stories/1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('gq:accessToken')}`,
      },
      body: JSON.stringify({ childId: 1 }),
    });
  });
  // 아이 관리로 갔다가 돌아오면 홈 쿼리가 다시 실행된다
  await page.getByRole('link', { name: '아이 관리' }).click();
  await page.waitForURL('**/children');
  await page.getByRole('link', { name: '홈으로' }).click();
  await page.waitForURL('**/home');

  await expect(page.getByText('진행 중인 이야기가 없어요.')).toBeHidden();
  await expect(page.getByText('3번째 장면까지 진행했어요.')).toBeVisible();
});
