// 이야기 상세 + 세션 시작 — MSW 목 기준 스펙.
import { expect, test, type Page } from '@playwright/test';

const DEMO = { email: 'demo@goodquestion.dev', password: 'demo1234!' };

/**
 * 목 상태는 페이지 컨텍스트의 모듈 변수라 전체 새로고침마다 시드로 되돌아간다.
 * 초기화한 뒤에는 goto 를 쓰지 않고 화면 안에서 이동한다.
 */
async function startFresh(page: Page, { withoutChildren = false } = {}) {
  await page.goto('/login');
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

test('미로그인으로 상세에 오면 로그인으로 보낸다', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/stories/1');
  await page.waitForURL('**/login');
});

test('홈에서 이야기를 누르면 상세가 열리고 소개를 보여준다', async ({ page }) => {
  await startFresh(page);

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');

  await expect(page.getByRole('heading', { name: '방귀 뀌는 며느리' })).toBeVisible();
  await expect(page.getByText('옛날 옛날, 방귀를 아주 크게 뀌는 며느리가 살았어요.')).toBeVisible();
  await expect(page.getByRole('heading', { name: '어떤 이야기일까?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이 이야기에서 너는?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '이야기 시작하기 →' })).toBeVisible();
  // 시안의 보조 동작 3개
  await expect(page.getByRole('button', { name: '이야기 듣기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '캐릭터와 말하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 만들어 보기' })).toBeVisible();
});

test('시작하기를 누르면 세션이 만들어지고 플레이 화면으로 간다', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');

  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();
  await page.waitForURL(/\/play\/\d+$/);

  await expect(page.getByRole('heading', { name: '방귀 뀌는 며느리' })).toBeVisible();
  // 클릭으로 들어왔으므로 잠금 화면 없이 바로 내레이션이 시작된다
  await expect(page.getByTestId('play-stage')).toHaveAttribute('data-state', 'narrating', {
    timeout: 20000,
  });
});

test('이미 진행 중이면 시작하기 대신 이어하기를 보여준다', async ({ page }) => {
  // 백엔드는 세션을 재사용하지 않고 매번 새로 만든다 — 화면이 중복 생성을 막아야 한다
  await startFresh(page);
  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();
  await page.waitForURL(/\/play\/\d+$/);
  const firstSession = page.url();

  // 홈을 거쳐 상세로 돌아온다
  await page.getByRole('link', { name: '이야기 나가기' }).click();
  await page.waitForURL('**/home');
  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).last().click();
  await page.waitForURL('**/stories/1');

  await expect(page.getByRole('link', { name: '이어서 하기 →' })).toBeVisible();
  await expect(page.getByRole('button', { name: '이야기 시작하기 →' })).toBeHidden();
  // 진행 중에는 세션 재시작 API 가 없어 "다시 만들어 보기" 를 열어두면 안 된다
  await expect(page.getByRole('button', { name: '다시 만들어 보기' })).toBeDisabled();

  await page.getByRole('link', { name: '이어서 하기 →' }).click();
  await page.waitForURL(/\/play\/\d+$/);
  expect(page.url()).toBe(firstSession); // 새 세션을 만들지 않았다
});

test('동의 없는 아이는 세션 시작이 막히고 동의 화면으로 안내한다', async ({ page }) => {
  // 실백엔드가 2026-08-14 부터 동의 없는 세션 시작을 404 로 막는다.
  // 동의 화면이 생기기 전에 등록된 아이가 이 상태다 — 철회로 같은 상태를 만든다
  await startFresh(page);
  await page.evaluate(async () => {
    await fetch('/api/children/1/consent', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('gq:accessToken')}` },
    });
  });

  await page.getByRole('link', { name: /방귀 뀌는 며느리/ }).first().click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();

  // 막다른 오류 대신 원인과 다음 행동을 알려준다
  await expect(page.getByText('이야기를 시작하려면 보호자 동의가 필요해요.')).toBeVisible();
  await page.getByRole('link', { name: '동의하러 가기' }).click();
  await page.waitForURL(/\/children\/1\/consent/);

  // 동의를 마치면 보던 이야기로 돌아와 이어서 시작할 수 있다
  await page.getByLabel('아동 개인정보 수집·이용 동의 (필수)').check();
  await page.getByRole('button', { name: '동의하고 계속하기' }).click();
  await page.waitForURL('**/stories/1');
  await page.getByRole('button', { name: '이야기 시작하기 →' }).click();
  await page.waitForURL(/\/play\/\d+$/);
});

test('아이가 없으면 시작 대신 등록 안내를 보여준다', async ({ page }) => {
  // clearChildren 은 저장소에 기록되므로 새로고침·주소 직접 입력에도 유지된다
  await startFresh(page, { withoutChildren: true });
  await page.goto('/stories/1');

  await expect(page.getByText('이야기를 시작하려면 아이를 먼저 등록해 주세요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '이야기 시작하기 →' })).toBeHidden();
  await expect(page.getByRole('link', { name: '아이 등록하기' })).toBeVisible();
});
