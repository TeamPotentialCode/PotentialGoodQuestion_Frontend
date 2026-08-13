// 말하기 후 활동 — ㅈㄷㄹ장면 순서 맞추기.
// 목은 카드를 고정 순서(card_3, card_1, card_5, card_2, card_4)로 준다 —
// 그래야 정해진 키 입력으로 정답을 만들 수 있다.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

const screen = (page: Page) => page.getByTestId('post-order');

/** 로그인 → 세션 생성 → 순서 맞추기 화면으로 직행 (대화 완주는 play.spec 이 덮는다) */
async function enterOrder(page: Page): Promise<number> {
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

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.waitForURL(/\/play\/\d+$/);
  const sessionId = Number(page.url().split('/').pop());

  await page.goto(`/sessions/${sessionId}/post/order`);
  await expect(screen(page)).toBeVisible();
  return sessionId;
}

/** 화면에 놓인 카드 순서 (E2E 전용 data-card-id — 사용자에게는 안 보인다) */
function currentOrder(page: Page) {
  return page.locator('[data-card-id]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-card-id') ?? ''),
  );
}

/**
 * 키보드로 한 카드를 오른쪽으로 한 칸 옮긴다 (스페이스로 집고 → 화살표 → 스페이스로 놓기).
 * dnd-kit 은 집기·이동·놓기 사이에 한 틱씩 필요해서 간격을 둔다 — 붙여 누르면 이동이 씹힌다
 */
async function moveRight(page: Page, cardId: string) {
  const before = await currentOrder(page);
  await page.locator(`[data-card-id="${cardId}"] button`).focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
  await expect
    .poll(() => currentOrder(page), { timeout: 5000 })
    .not.toEqual(before);
}

test('카드 5장이 섞인 채로 보이고 정답 순서는 드러나지 않는다', async ({ page }) => {
  await enterOrder(page);

  await expect(page.getByText('이야기를 순서대로 놓아 볼까?')).toBeVisible();
  await expect(page.locator('[data-card-id]')).toHaveCount(5);
  await expect(await currentOrder(page)).toEqual([
    'card_3',
    'card_1',
    'card_5',
    'card_2',
    'card_4',
  ]);

  // 카드 id 는 정답 순서를 담고 있으므로 화면 글자로는 새어 나가면 안 된다
  await expect(page.getByText(/card_\d/)).toBeHidden();
  await expect(page.getByText('1 / 2')).toBeVisible();
});

test('틀린 순서로 제출하면 안내가 뜨고 화면에 머문다', async ({ page }) => {
  const sessionId = await enterOrder(page);

  // 섞인 그대로 제출 = 오답
  await page.getByRole('button', { name: '순서 확인하기' }).click();
  // getByRole('alert') 는 Next 의 라우트 안내 요소와도 겹친다
  await expect(page.getByText('아직 순서가 달라요. 다시 놓아 볼까?')).toBeVisible();
  expect(page.url()).toContain(`/sessions/${sessionId}/post/order`);
  // 카드는 그대로 남아 다시 해볼 수 있다
  await expect(page.locator('[data-card-id]')).toHaveCount(5);
});

test('키보드로 카드를 옮기면 자리가 바뀐다', async ({ page }) => {
  await enterOrder(page);

  await moveRight(page, 'card_3');
  await expect(await currentOrder(page)).toEqual([
    'card_1',
    'card_3',
    'card_5',
    'card_2',
    'card_4',
  ]);
});

test('정답 순서로 맞추면 다시 말하기로 넘어가고 핵심 단어가 남는다', async ({ page }) => {
  const sessionId = await enterOrder(page);

  // card_3, card_1, card_5, card_2, card_4 → card_1 … card_5
  await moveRight(page, 'card_3'); // card_1 card_3 card_5 card_2 card_4
  await moveRight(page, 'card_5'); // card_1 card_3 card_2 card_5 card_4
  await moveRight(page, 'card_3'); // card_1 card_2 card_3 card_5 card_4
  await moveRight(page, 'card_5'); // card_1 card_2 card_3 card_4 card_5
  await expect(await currentOrder(page)).toEqual([
    'card_1',
    'card_2',
    'card_3',
    'card_4',
    'card_5',
  ]);

  await page.getByRole('button', { name: '순서 확인하기' }).click();
  await page.waitForURL(/\/post\/retelling$/, { timeout: 15000 });

  // 핵심 단어는 정답 응답으로만 오므로 새로고침에 대비해 저장해 둔다
  const handoff = await page.evaluate(
    (id) => sessionStorage.getItem(`gq.activity.${id}`),
    sessionId,
  );
  expect(handoff).not.toBeNull();
  const parsed = JSON.parse(handoff!) as { submittedOrder: string[]; retellingKeywords: string[] };
  expect(parsed.retellingKeywords).toHaveLength(5);
  expect(parsed.submittedOrder).toEqual(['card_1', 'card_2', 'card_3', 'card_4', 'card_5']);
});

/** 순서를 맞혀 다시 말하기 화면까지 간다 */
async function reachRetelling(page: Page): Promise<number> {
  const sessionId = await enterOrder(page);
  await moveRight(page, 'card_3');
  await moveRight(page, 'card_5');
  await moveRight(page, 'card_3');
  await moveRight(page, 'card_5');
  await page.getByRole('button', { name: '순서 확인하기' }).click();
  await page.waitForURL(/\/post\/retelling$/, { timeout: 15000 });
  return sessionId;
}

test('다시 말하기: 정답 순서의 카드와 핵심 단어가 보인다', async ({ page }) => {
  await reachRetelling(page);

  await expect(page.getByText('이번에는 네가 이야기를 들려줄 차례야!')).toBeVisible();
  await expect(page.getByText('이야기 순서 (1 ~ 5)')).toBeVisible();
  for (const word of ['며느리', '방귀', '배나무', '마을', '특별한 힘']) {
    await expect(page.getByText(word, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: '말하기' })).toBeVisible();
});

test('다시 말하기: 새로고침해도 핵심 단어가 남는다', async ({ page }) => {
  await reachRetelling(page);
  await page.reload();
  await expect(page.getByTestId('post-retelling')).toBeVisible();
  await expect(page.getByText('특별한 힘', { exact: true })).toBeVisible();
});

test('다시 말하기: 순서를 안 맞히고 들어오면 순서 화면으로 안내한다', async ({ page }) => {
  const sessionId = await enterOrder(page);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`/sessions/${sessionId}/post/retelling`);

  await expect(page.getByText('먼저 이야기 순서를 맞춰 볼까?')).toBeVisible();
  await page.getByRole('link', { name: '순서 맞추러 가기' }).click();
  await page.waitForURL(/\/post\/order$/);
});

test('다시 말하기: 말하고 보내면 완료 화면으로 간다', async ({ page }) => {
  const sessionId = await reachRetelling(page);

  await page.getByRole('button', { name: '말하기' }).click();
  await expect(page.getByTestId('post-retelling')).toHaveAttribute('data-step', 'recording');
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: '보내기' }).click();
  await expect(page.getByText('내가 이렇게 말했어요')).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: '보내기' }).click();
  await page.waitForURL(new RegExp(`/sessions/${sessionId}/complete$`), { timeout: 20000 });

  await expect(page.getByText('오늘의 이야기를 모두 마쳤어!')).toBeVisible();
  await expect(page.getByText('방귀 뀌는 며느리')).toBeVisible();
  await page.getByRole('link', { name: '홈으로 가기' }).click();
  await page.waitForURL('**/home');
});
