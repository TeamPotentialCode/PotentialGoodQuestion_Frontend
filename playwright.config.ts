import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            // 오디오 작업 때 실제 아동 음성 wav 경로를 넣는다.
            // 16kHz 모노가 아니면 Chromium 이 무시한다.
            // '--use-file-for-fake-audio-capture=./e2e/fixtures/child-voice-16k.wav',
          ],
        },
      },
    },
  ],

  // E2E 종료 시 개발 서버를 반드시 내린다 — 캐시 충돌 방지.
  // 실행 전에 pnpm dev 를 꺼둬야 한다.
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
