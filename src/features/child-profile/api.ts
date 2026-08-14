import { apiRequest } from '@/core/api/client';
import type {
  Child,
  ChildUpsertRequest,
  ConsentInfo,
  ConsentRequest,
} from '@/core/api/types';

export function getChildren(): Promise<Child[]> {
  return apiRequest<Child[]>('/children');
}

// 요청은 age 로 보내고, 응답은 서버가 birthYear 로 환산해 돌려준다
export function createChild(request: ChildUpsertRequest): Promise<Child> {
  return apiRequest<Child>('/children', { body: request });
}

// 수정 요청 형태는 등록과 동일하다 (백엔드 ChildRequestDto.Update = Create)
export function updateChild(childId: number, request: ChildUpsertRequest): Promise<Child> {
  return apiRequest<Child>(`/children/${childId}`, { method: 'PATCH', body: request });
}

export function createConsent(childId: number, request: ConsentRequest): Promise<ConsentInfo> {
  return apiRequest<ConsentInfo>(`/children/${childId}/consent`, { body: request });
}

/** 유효한 동의가 없으면 404 로 떨어진다 — 부르는 쪽이 "동의 없음"으로 해석한다 */
export function getConsent(childId: number): Promise<ConsentInfo> {
  return apiRequest<ConsentInfo>(`/children/${childId}/consent`);
}
