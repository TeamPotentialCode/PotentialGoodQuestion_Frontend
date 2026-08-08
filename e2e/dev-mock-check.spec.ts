// 수동 검증 자동화 — 확인 후 삭제하는 임시 스펙
import { expect, test } from '@playwright/test';

test('목 콘솔로 4개 장면을 완주하고 사후활동·리포트까지 도달한다', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/dev');

  const log = page.locator('pre');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(log).toContainText('로그인: 데모 보호자');

  await page.getByRole('button', { name: '세션 생성' }).click();
  await expect(log).toContainText('장면 3 며느리, 내레이션 2개, maxTurns 4');

  // 제안 발화로 4개 장면 완주 (씬당 preferredTurns 2~3턴)
  const turnButton = page.getByRole('button', { name: '한 턴 (제안 발화)' });
  for (let i = 0; i < 12; i += 1) {
    await turnButton.click();
    await expect(turnButton).toBeEnabled(); // 턴 완료 대기 (진행 중 비활성화)
    const text = (await log.textContent()) ?? '';
    if (text.includes('이야기 완료!')) break;
  }
  await expect(log).toContainText('이야기 완료!');

  await page.getByRole('button', { name: '사후 활동' }).click();
  await expect(log).toContainText('오답 시도 → correct false, keywords []');
  await expect(log).toContainText('정답 시도 → correct true, keywords [방귀,며느리,참다,시원하다]');

  await page.getByRole('button', { name: '리포트' }).click();
  await expect(log).toContainText('리포트: 달성률');
});

test('아무말 반복은 GUIDED를 거쳐 MAX_TURNS로 닫힌다', async ({ page }) => {
  await page.goto('/dev');
  const log = page.locator('pre');
  await page.getByRole('button', { name: '초기화' }).click();
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(log).toContainText('로그인:');
  await page.getByRole('button', { name: '세션 생성' }).click();
  await expect(log).toContainText('장면 3');

  const babble = page.getByRole('button', { name: '한 턴 (아무말)' });
  for (let i = 0; i < 4; i += 1) {
    await babble.click();
    await expect(babble).toBeEnabled();
  }
  await expect(log).toContainText('GUIDED');
  await expect(log).toContainText('다음 장면');
});

test('stt-empty 시나리오는 빈 텍스트로 턴을 중단한다', async ({ page }) => {
  await page.goto('/dev');
  const log = page.locator('pre');
  await page.getByRole('button', { name: '초기화' }).click();
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(log).toContainText('로그인:');
  await page.getByRole('button', { name: '세션 생성' }).click();
  await expect(log).toContainText('장면 3');

  await page.locator('select').selectOption('stt-empty');
  await page.getByRole('button', { name: '한 턴 (제안 발화)' }).click();
  await expect(log).toContainText('STT 실패/빈 텍스트 — 턴 중단');
});
