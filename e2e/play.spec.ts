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
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/children');
  // 로그인 다음은 아이 선택 화면이다(CHILD-01)
  await page.getByRole('button', { name: '이 아이로 시작하기' }).click();
  await page.waitForURL('**/home');

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();
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

/**
 * 도입 내레이션 → 첫 대사 재생 → 아이 차례.
 * 클릭으로 들어왔으므로 잠금 화면 없이 바로 내레이션이 시작되고,
 * 시안 v3 부터 마이크가 저절로 켜지므로 awaitingChild 는 잠깐 스치고 recording 이 된다
 */
async function unlockAndWaitTurn(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-state', 'narrating', { timeout: 20000 });
  await skipNarration(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'recording', { timeout: 20000 });
}

/** 아이 차례 한 번을 완주해 다음 상태까지 간다 */
async function playOneTurn(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-state', 'recording', { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'reviewing', { timeout: 20000 });
  await page.getByRole('button', { name: '보내기' }).click();
}

test('클릭으로 들어오면 잠금 화면 없이 도입 내레이션이 바로 시작된다', async ({ page }) => {
  await enterPlay(page);

  // 상세의 "이야기 시작하기 →" 클릭이 이미 제스처라 잠금 화면을 거치지 않는다
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
  // 마이크가 저절로 켜지므로 아이 차례는 recording 으로 나타난다
  await expect(stage(page)).toHaveAttribute('data-state', 'recording', { timeout: 20000 });
  await expect(page.getByText('장면 1 / 4')).toBeVisible();
});

test('잠금 해제 후 캐릭터 첫 대사가 나오고 아이 차례가 된다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  // 고정 대사의 ㅇㅇ 는 선택된 아이 이름으로 치환된다(시안: "민준아, …").
  // 같은 문장이 "최근 이야기"에도 쌓이므로 큰 말풍선 하나만 본다
  await expect(
    page.getByText(/문열아, 사실 나는 방귀가 너무 커서 참고 있어/).first(),
  ).toBeVisible();
  await expect(page.getByText('ㅇㅇ아')).toBeHidden();
  // 헤더에 장면 진행도가 보인다
  await expect(page.getByText('장면 1 / 4')).toBeVisible();
  // 좌측에 장면 설명이 보인다
  await expect(page.getByText(/이야기를 나누는 장면입니다/)).toBeVisible();
  // 아이는 아무것도 누르지 않았는데 이미 듣고 있다
  await expect(page.getByText('듣고 있어요!')).toBeVisible();
  await expect(page.getByRole('button', { name: '보내기' })).toBeVisible();
});

test('다시 듣기를 눌러도 진행 상태는 그대로다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await page.getByRole('button', { name: '캐릭터 대사 다시 듣기' }).click();
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');

  await page.getByRole('button', { name: '장면 설명 다시 듣기' }).click();
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
});

test('한 턴을 완주한다: 자동 녹음 → 보내기 → 확인 → 보내기 → 캐릭터 응답', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await page.waitForTimeout(400); // 실제로 잠깐 말하는 시간

  await page.getByRole('button', { name: '보내기' }).click();
  // transcribing 은 순식간에 지나갈 수 있으므로 다음 상태로 바로 확인한다
  await expect(stage(page)).toHaveAttribute('data-state', 'reviewing', { timeout: 20000 });
  await expect(page.getByText('이렇게 말했나요?')).toBeVisible();

  await page.getByRole('button', { name: '보내기' }).click();
  // 응답 재생이 끝나면 다시 아이 차례 — 마이크가 저절로 켜진다
  await expect(stage(page)).toHaveAttribute('data-state', 'recording', { timeout: 25000 });

  // 큰 말풍선은 새 응답으로 교체되고, 지나간 대사는 "최근 이야기"에 남는다
  await expect(page.getByText(/그랬구나/).first()).toBeVisible();
  const recent = page.getByRole('region', { name: '최근 이야기' });
  await expect(recent.getByText(/문열아, 사실 나는 방귀가 너무 커서/)).toBeVisible();
  // 아이가 한 말도 자기 이름으로 쌓인다
  await expect(recent.getByText('문열 (나)')).toBeVisible();
});

test('확인 화면에서 다시 말하기를 누르면 녹음으로 돌아간다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

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

  // 미션(씬7·씬9)은 문서상 "반드시 등장" — 완주 중 실제로 떴는지도 함께 확인한다
  let missionSeen = false;
  // 장면이 끝나면 "다음 장면"이 나오고, 그 사이 내레이션을 한 장 더 넘긴다.
  // 마지막 장면까지 끝나면 사후 활동으로 이동한다.
  // 장면당 2~3턴이라 넉넉히 돈다 — 사후 활동에 도착하면 빠져나온다
  for (let i = 0; i < 30 && !/\/post\/order$/.test(page.url()); i += 1) {
    // 아이가 행동할 수 있는 상태가 될 때까지 기다린다(재생·분석 중에는 버튼이 없다)
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-testid=play-stage]') ||
        ['recording', 'sceneComplete', 'narrating', 'mission', 'error', 'fatal'].includes(
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
      const next = page.getByRole('button', { name: '다음 장면으로' });
      // 마지막 장면에는 "다음 장면"이 없다 — 사후 활동으로 넘어간다
      if (!(await next.isVisible())) break;
      await next.click();
    } else if (state === 'mission') {
      // 미션은 안내를 읽고 닫으면 아이 차례가 된다 (씬7 미션1 · 씬9 미션2)
      missionSeen = true;
      await page.getByRole('button', { name: '알겠어! 말해 볼게' }).click();
    } else if (state === 'recording') {
      await playOneTurn(page);
    } else {
      throw new Error(`예상 못한 상태: ${state}`);
    }
  }

  await page.waitForURL(/\/post\/order$/, { timeout: 30000 });
  expect(missionSeen).toBe(true);
});

test('음성 인식에 실패하면 안내가 뜨고 다시 시도할 수 있다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);
  await page.evaluate(() => window.__gqMock?.setScenario('stt-fail-once'));

  await page.getByRole('button', { name: '보내기' }).click();

  await expect(stage(page)).toHaveAttribute('data-state', 'error', { timeout: 20000 });
  await expect(page.getByText(/한 번만 더/)).toBeVisible();

  await page.getByRole('button', { name: '다시 해보기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
});

test('마이크를 못 켜면 그 자리에서 알려준다', async ({ page }) => {
  // 설정의 --use-fake-ui-for-media-stream 이 권한을 자동 허용하므로
  // 브라우저 권한으로는 거부를 만들 수 없다. getUserMedia 를 직접 거부시킨다.
  // 예전에는 이 실패 신호가 버려져서 화면이 "듣고 있어요…" 에 그대로 머물렀다
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await enterPlay(page);
  // 마이크가 저절로 켜지려다 실패하므로 recording 을 거치지 않고 바로 error 가 된다
  await expect(stage(page)).toHaveAttribute('data-state', 'narrating', { timeout: 20000 });
  await skipNarration(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'error', { timeout: 15000 });
  await expect(page.getByText('마이크를 쓸 수 있게 허용해 주세요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 해보기' })).toBeVisible();
});

test('녹음 중에는 마이크 입력 크기가 보인다', async ({ page }) => {
  await enterPlay(page);
  await unlockAndWaitTurn(page);

  await expect(stage(page)).toHaveAttribute('data-state', 'recording');
  // 소리가 들어오는지 눈으로 알 수 있어야 한다 (가짜 장치라 값 자체는 단언하지 않는다)
  await expect(page.getByTestId('mic-level')).toBeVisible();
});

test('클릭 이력이 없으면 잠금 화면이 폴백으로 남는다', async ({ page }) => {
  // 새로고침·주소 직접 입력을 흉내낸다 — sticky activation 이 없다고 브라우저가 답하게 한다
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userActivation', {
      value: { hasBeenActive: false, isActive: false },
    });
  });
  await enterPlay(page);

  await expect(stage(page)).toHaveAttribute('data-state', 'locked');
  await expect(page.getByText('이야기를 만날 준비 됐어?')).toBeVisible();
  // 버튼을 누르면(=제스처) 평소처럼 내레이션이 시작된다
  await page.getByRole('button', { name: '이야기 시작하기' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'narrating', { timeout: 20000 });
});
