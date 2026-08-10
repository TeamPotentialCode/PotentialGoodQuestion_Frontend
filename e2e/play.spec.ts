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

/** 오디오 잠금 해제 → 첫 대사 재생 → 아이 차례 */
async function unlockAndWaitTurn(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-state', 'locked');
  await page.getByRole('button', { name: '이야기 시작하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'awaitingChild', { timeout: 20000 });
}

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
