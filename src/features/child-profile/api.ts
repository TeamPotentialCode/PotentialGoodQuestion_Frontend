import { apiRequest } from '@/core/api/client';
import type { Child, ChildUpsertRequest } from '@/core/api/types';

export function getChildren(): Promise<Child[]> {
  return apiRequest<Child[]>('/children');
}

// 요청은 age 로 보내고, 응답은 서버가 birthYear 로 환산해 돌려준다
export function createChild(request: ChildUpsertRequest): Promise<Child> {
  return apiRequest<Child>('/children', { body: request });
}
