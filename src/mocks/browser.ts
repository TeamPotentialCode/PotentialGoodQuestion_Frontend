import { setupWorker } from 'msw/browser';
import { handlers } from '@/mocks/handlers';
import { resetScenario, setScenario } from '@/mocks/scenario';
import { resetMockState } from '@/mocks/session-store';

export const worker = setupWorker(...handlers);

// DevTools 콘솔·Playwright(page.evaluate)에서 목 상태를 조작하기 위한 훅
declare global {
  interface Window {
    __gqMock?: {
      setScenario: typeof setScenario;
      resetScenario: typeof resetScenario;
      resetMockState: typeof resetMockState;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__gqMock = { setScenario, resetScenario, resetMockState };
}
