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
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  // 로그인 다음은 아이 선택 화면이다(CHILD-01)
  await page.waitForURL('**/children');
  if (withoutChildren) return; // 고를 아이가 없으면 여기서 멈춘다 — 시작 버튼이 비활성이다
  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
  await page.waitForURL('**/home');
}

test('아이가 없으면 등록 안내만 보이고 이야기 영역은 그리지 않는다', async ({ page }) => {
  await startFresh(page, { withoutChildren: true });
  // 아이 선택 화면에서는 고를 게 없다 — 홈으로 직접 들어가 안내를 확인한다
  await expect(page.getByRole('button', { name: '이 아이로 시작하기' })).toBeDisabled();
  await page.goto('/home');

  await expect(page.getByRole('heading', { name: '먼저 아이를 등록해 주세요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '아이 등록하기' })).toBeVisible();
  // 아이가 없으면 홈 조회 자체를 하지 않는다
  await expect(page.getByRole('heading', { name: '오늘의 추천 이야기' })).toBeHidden();
  await expect(page.getByRole('heading', { name: '이어서 이야기하기' })).toBeHidden();
});

test('아이가 있으면 이어하기 없음과 추천 이야기를 보여준다', async ({ page }) => {
  await startFresh(page);

  await expect(page.getByRole('heading', { name: '이어서 이야기하기' })).toBeVisible();
  await expect(page.getByText('진행 중인 이야기가 없어요.')).toBeVisible();

  await expect(page.getByRole('heading', { name: '오늘의 추천 이야기' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '방귀 뀌는 며느리' })).toBeVisible();
  // 시안: 뱃지 + 소요 시간이 한 줄, 주제는 점으로 이어 쓴다
  await expect(page.getByText('시작 가능')).toBeVisible();
  await expect(page.getByText('다름 · 자기이해 · 장점 발견')).toBeVisible();
  // 추천은 늘 3장 — 모자란 자리는 "준비 중"이 메우고 누를 수 없다
  await expect(page.getByText('준비 중', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('link', { name: /이야기 제목/ })).toHaveCount(0);
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
  // 화면 안 이동만으로는 홈 쿼리가 다시 안 돈다(staleTime 30초).
  // 목 세션은 저장소에 남으므로 새로고침해도 살아 있다 — 이걸로 확실히 다시 읽힌다
  await page.reload();

  await expect(page.getByText('진행 중인 이야기가 없어요.')).toBeHidden();
  // 시안의 이어하기 카드 — 제목·진행도·이어서 하기
  await expect(page.getByRole('link', { name: '이어서 하기' })).toBeVisible();
  await expect(page.getByText(/장면 1 \/ 4/)).toBeVisible();
});
