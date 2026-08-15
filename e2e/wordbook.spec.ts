// 단어장 — 담기(내레이션 화면) → 단어장에서 뜻 확인 → 즐겨찾기 → 마이페이지 성장 레이더.
// 백엔드 khj_04 의 단어장·성장 API 를 목으로 미러링한 상태에서 돈다.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

/**
 * 로그인 → 이야기 시작 → /play 진입까지 (play.spec.ts 의 enterPlay 와 같은 경로).
 * 대화 장면이 아니라 **내레이션 화면**에서 담는다 — 목의 대화 장면 설명은
 * "…이야기를 나누는 장면입니다." 라 담을 만한 낱말이 없지만 내레이션은 원문 이야기다.
 */
async function enterNarration(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인' }).waitFor();
  await page.evaluate(() => {
    localStorage.clear();
    window.__gqMock?.resetMockState();
  });
  await page.getByLabel('이메일').fill(DEMO.email);
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/children');
  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
  await page.waitForURL('**/home');

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();
  await page.waitForURL(/\/play\/\d+$/);
  await expect(page.getByTestId('play-stage')).toHaveAttribute('data-state', 'narrating', {
    timeout: 20000,
  });
}

test('이야기 중 모르는 단어를 담으면 단어장에 뜻과 함께 쌓인다', async ({ page }) => {
  await enterNarration(page);

  // 모드가 꺼져 있으면 본문은 그냥 글이다 — 읽기를 방해하지 않는다
  await expect(page.getByText(/옛날 어느 마을에/)).toBeVisible();
  await expect(page.getByRole('button', { name: '며느리가 담기' })).toBeHidden();

  await page.getByRole('button', { name: '단어 담기' }).click();
  await expect(page.getByText('모르는 단어를 눌러 봐.')).toBeVisible();

  // "방귀를"은 두 문장에 나와 모호하다 — 한 번만 나오는 낱말을 쓴다
  await page.getByRole('button', { name: '며느리가 담기' }).click();

  // 누른 자리에서 바로 뜻 카드가 뜬다 (뜻은 백엔드가 저장하면서 GPT 로 만든다)
  const popup = page.getByRole('dialog', { name: '며느리가 뜻' });
  await expect(popup).toBeVisible();
  await expect(popup.getByText('아들의 아내를 부르는 말이에요.')).toBeVisible({ timeout: 20000 });
  await expect(popup.getByText(/예: /)).toBeVisible();
  await popup.getByRole('button', { name: '닫기' }).click();
  await expect(popup).toBeHidden();
  await expect(page.getByText('"며느리가" 담았어요!')).toBeVisible();

  // 같은 단어를 또 누르면 저장 요청 없이 뜻만 다시 보여준다 (사전처럼)
  await page.getByRole('button', { name: '며느리가 담기' }).click();
  await expect(popup.getByText('아들의 아내를 부르는 말이에요.')).toBeVisible();
  await popup.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByText('이미 담아 뒀어!')).toBeVisible();

  // 담은 단어는 단어장에 뜻·예시와 함께 있다 (뜻은 백엔드가 저장할 때 만든다)
  await page.goto('/words');
  await expect(page.getByRole('heading', { name: '며느리가' })).toBeVisible();
  await expect(page.getByText('아들의 아내를 부르는 말이에요.')).toBeVisible();
  await expect(page.getByText(/모은 단어 1개/)).toBeVisible();

  // 즐겨찾기 토글
  const star = page.getByRole('button', { name: '며느리가 즐겨찾기' });
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/즐겨찾기 1개/)).toBeVisible();
});

test('개수 요약을 누르면 전체·즐겨찾기로 걸러진다', async ({ page }) => {
  await enterNarration(page);
  await page.getByRole('button', { name: '단어 담기' }).click();
  for (const word of ['며느리가', '시집온']) {
    await page.getByRole('button', { name: `${word} 담기` }).click();
    // 카드를 닫아야 다음 단어를 누를 수 있다
    const card = page.getByRole('dialog', { name: `${word} 뜻` });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: '닫기' }).click();
    await expect(page.getByText(`"${word}" 담았어요!`)).toBeVisible({ timeout: 20000 });
  }

  await page.goto('/words');
  await expect(page.getByRole('heading', { name: '며느리가' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '시집온' })).toBeVisible();

  // 아직 즐겨찾기가 없으면 큰 빈 화면 대신 "별을 눌러 보라"고 안내한다
  await page.getByRole('button', { name: /즐겨찾기 0개/ }).click();
  await expect(page.getByText('아직 즐겨찾기한 단어가 없어요.')).toBeVisible();
  await page.getByRole('button', { name: '전체 단어 보기' }).click();

  // 하나만 별을 켜고 거르면 그 단어만 남는다
  await page.getByRole('button', { name: '시집온 즐겨찾기' }).click();
  await page.getByRole('button', { name: /즐겨찾기 1개/ }).click();
  await expect(page.getByRole('heading', { name: '시집온' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '며느리가' })).toBeHidden();
});

test('마이페이지에 성장 레이더와 어려웠던 단어가 함께 나온다', async ({ page }) => {
  await enterNarration(page);
  await page.getByRole('button', { name: '단어 담기' }).click();
  await page.getByRole('button', { name: '며느리가 담기' }).click();
  await page.getByRole('dialog', { name: '며느리가 뜻' }).getByRole('button', { name: '닫기' }).click();
  await expect(page.getByText('"며느리가" 담았어요!')).toBeVisible({ timeout: 20000 });

  await page.goto('/me');
  await expect(page.getByRole('img', { name: /사고 요소 성장 그래프/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이런 단어가 어려웠어요' })).toBeVisible();
  await expect(page.getByText('아들의 아내를 부르는 말이에요.')).toBeVisible();
});
