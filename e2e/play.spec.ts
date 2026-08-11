// 대화 화면 — MSW 목 기준 스펙.
// 상태 단언은 대사 텍스트가 아니라 data-state(phase tag)로 한다 — 대사는 매번 달라진다.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

const stage = (page: Page) => page.getByTestId('play-stage');

/** 로그인 → 이야기 시작 → /play 진입까지. 목 상태는 시드 그대로 쓴다 */
async function enterPlay(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인' }).waitFor();
  await page.evaluate(() => {
    localStorage.clear();
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
}

/**
 * 내레이션이 나오는 동안 "다음"을 눌러 대화 장면까지 넘어간다.
 * 누른 뒤 data-narration 이 실제로 바뀔 때까지 기다린다 —
 * 그러지 않으면 마지막 장을 넘긴 직후 사라진 버튼을 다시 누르려다 실패한다
 */
async function skipNarration(page: Page) {
  while ((await stage(page).getAttribute('data-state')) === 'narrating') {
    const at = (await stage(page).getAttribute('data-narration')) ?? '';
    await page.getByRole('button', { name: '다음 →' }).click();
    await expect(stage(page)).not.toHaveAttribute('data-narration', at, { timeout: 20000 });
  }
}

/** 오디오 잠금 해제 → 도입 내레이션 → 첫 대사 재생 → 아이 차례 */
async function unlockAndWaitTurn(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-state', 'locked');
  await page.getByRole('button', { name: '이야기 시작하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'narrating', { timeout: 20000 });
  await skipNarration(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild', { timeout: 20000 });
}

/** 아이 차례 한 번을 완주해 다음 상태까지 간다 */
async function playOneTurn(page: Page) {
  await page.getByRole('button', { name: '말하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'reviewing', { timeout: 20000 });
  await page.getByRole('button', { name: '보내기' }).click();
}

test('잠금 해제 전 도입 내레이션 2장을 넘긴 뒤 대화가 시작된다', async ({ page }) => {
  await enterPlay(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'locked');
  await page.getByRole('button', { name: '이야기 시작하기' }).click();

  // 1장: 헤더 배지와 내레이션 문장
  await expect(stage(page)).toHaveAttribute('data-state', 'narrating', { timeout: 20000 });
  await expect(page.getByText('시작 (1/5)')).toBeVisible();
  await expect(page.getByText(/옛날 어느 마을에/)).toBeVisible();

  // 다시 듣기는 재생만 하고 장을 넘기지 않는다
  await page.getByRole('button', { name: '내레이션 다시 듣기' }).click();
  await page.waitForTimeout(300);
  await expect(page.getByText('시작 (1/5)')).toBeVisible();

  // 2장으로 넘어간다
  await page.getByRole('button', { name: '다음 →' }).click();
  await expect(page.getByText('시작 (2/5)')).toBeVisible();
  await expect(page.getByText(/얼굴이 노래지고/)).toBeVisible();

  // 마지막 내레이션을 넘기면 대화 장면이 시작된다
  await page.getByRole('button', { name: '다음 →' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild', { timeout: 20000 });
  await expect(page.getByText('장면 1 / 4')).toBeVisible();
});

test('잠금 해제 후 캐릭터 첫 대사가 나오고 아이 차례가 된다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  // 고정 대사의 ㅇㅇ 는 치환하지 않고 주석으로 설명한다
  await expect(page.getByText(/ㅇㅇ아, 사실 나는 방귀가 너무 커서 참고 있어/)).toBeVisible();
  await expect(page.getByText('* ㅇㅇ = 아이 이름')).toBeVisible();
  // 헤더에 장면 진행도가 보인다
  await expect(page.getByText('장면 1 / 4')).toBeVisible();
  // 좌측에 장면 설명이 보인다
  await expect(page.getByText(/이야기를 나누는 장면입니다/)).toBeVisible();
  await expect(page.getByRole('button', { name: '말하기' })).toBeVisible();
});

test('다시 듣기를 눌러도 진행 상태는 그대로다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await page.getByRole('button', { name: '캐릭터 대사 다시 듣기' }).click();
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild');

  await page.getByRole('button', { name: '장면 설명 다시 듣기' }).click();
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild');
});

test('한 턴을 완주한다: 말하기 → 보내기 → 확인 → 보내기 → 캐릭터 응답', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await page.getByRole('button', { name: '말하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
  await page.waitForTimeout(400); // 실제로 잠깐 말하는 시간

  await page.getByRole('button', { name: '보내기' }).click();
  // transcribing 은 순식간에 지나갈 수 있으므로 다음 상태로 바로 확인한다
  await expect(stage(page)).toHaveAttribute('data-state', 'reviewing', { timeout: 20000 });
  await expect(page.getByText('이렇게 말했나요?')).toBeVisible();

  await page.getByRole('button', { name: '보내기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild', { timeout: 25000 });

  // 캐릭터 대사가 응답으로 교체된다(시안은 로그를 쌓지 않는다)
  await expect(page.getByText(/그랬구나/)).toBeVisible();
  await expect(page.getByText(/ㅇㅇ아, 사실 나는 방귀가 너무 커서/)).toBeHidden();
});

test('확인 화면에서 다시 말하기를 누르면 녹음으로 돌아간다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await page.getByRole('button', { name: '말하기' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'reviewing', { timeout: 20000 });

  await page.getByRole('button', { name: '다시 말하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
  await expect(page.getByText('이렇게 말했나요?')).toBeHidden();
});

test('대화 4장면을 완주하면 사후 활동으로 넘어간다', async ({ page }) => {
  test.setTimeout(180_000);
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  // 장면이 끝나면 "다음 장면"이 나오고, 그 사이 내레이션을 한 장 더 넘긴다.
  // 마지막 장면까지 끝나면 사후 활동으로 이동한다.
  // 장면당 2~3턴이라 넉넉히 돈다 — 사후 활동에 도착하면 빠져나온다
  for (let i = 0; i < 30 && !/\/post\/order$/.test(page.url()); i += 1) {
    // 아이가 행동할 수 있는 상태가 될 때까지 기다린다(재생·분석 중에는 버튼이 없다)
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-testid=play-stage]') ||
        ['awaitingChild', 'sceneComplete', 'narrating', 'error', 'fatal'].includes(
          document.querySelector<HTMLElement>('[data-testid=play-stage]')?.dataset.state ?? '',
        ),
      null,
      { timeout: 30000 },
    );
    if (/\/post\/order$/.test(page.url())) break;

    const state = await stage(page).getAttribute('data-state');
    if (state === 'narrating') {
      await skipNarration(page);
    } else if (state === 'sceneComplete') {
      const next = page.getByRole('button', { name: '다음 장면 →' });
      // 마지막 장면에는 "다음 장면"이 없다 — 사후 활동으로 넘어간다
      if (!(await next.isVisible())) break;
      await next.click();
    } else if (state === 'awaitingChild') {
      await playOneTurn(page);
    } else {
      throw new Error(`예상 못한 상태: ${state}`);
    }
  }

  await page.waitForURL(/\/post\/order$/, { timeout: 30000 });
});

test('음성 인식에 실패하면 안내가 뜨고 다시 시도할 수 있다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);
  await page.evaluate(() => window.__gqMock?.setScenario('stt-fail-once'));

  await page.getByRole('button', { name: '말하기' }).click();
  await page.getByRole('button', { name: '보내기' }).click();

  await expect(stage(page)).toHaveAttribute('data-state', 'error', { timeout: 20000 });
  await expect(page.getByText(/한 번만 더/)).toBeVisible();

  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
});
