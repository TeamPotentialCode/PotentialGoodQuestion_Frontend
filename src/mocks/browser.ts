import { setupWorker } from 'msw/browser';
import { clearChildren, handlers, resetApiState } from '@/mocks/handlers';
import { resetScenario, setScenario } from '@/mocks/scenario';
import { resetMockState as resetSessionState } from '@/mocks/session-store';

export const worker = setupWorker(...handlers);

// 세션·인증·아이 상태를 한 번에 시드로 되돌린다
function resetMockState(): void {
  resetSessionState();
  resetApiState();
}

// DevTools 콘솔·Playwright(page.evaluate)에서 목 상태를 조작하기 위한 훅
declare global {
  interface Window {
    __gqMock?: {
      setScenario: typeof setScenario;
      resetScenario: typeof resetScenario;
      resetMockState: typeof resetMockState;
      clearChildren: typeof clearChildren;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__gqMock = { setScenario, resetScenario, resetMockState, clearChildren };
}
