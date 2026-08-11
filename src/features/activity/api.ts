import { apiRequest } from '@/core/api/client';
import type { ActivityCardSet, ActivityResult, ActivitySubmitRequest } from '@/core/api/types';

/** 말하기 후 활동 시작 — 섞인 카드를 받는다. 세션당 활동은 하나라 여러 번 불러도 같은 활동이다 */
export function startActivity(sessionId: number): Promise<ActivityCardSet> {
  return apiRequest<ActivityCardSet>(`/sessions/${sessionId}/activity`, { body: {} });
}

/**
 * 순서 제출 + (있으면) 재구성 텍스트 저장.
 * submittedOrder 는 다시 말하기 단계에서도 함께 보내야 한다 — 서버가 항상 요구한다
 */
export function submitActivity(
  sessionId: number,
  request: ActivitySubmitRequest,
): Promise<ActivityResult> {
  return apiRequest<ActivityResult>(`/sessions/${sessionId}/activity`, {
    method: 'PATCH',
    body: request,
  });
}
