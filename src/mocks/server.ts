// 노드 환경용 MSW 서버 — 현재는 미사용, Playwright·노드 테스트 대비용
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

export const server = setupServer(...handlers);
