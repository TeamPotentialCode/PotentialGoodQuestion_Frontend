import { apiRequest } from '@/core/api/client';
import type { SessionInfo, StoryDetail } from '@/core/api/types';

export function getStoryDetail(storyId: number): Promise<StoryDetail> {
  return apiRequest<StoryDetail>(`/stories/${storyId}`);
}

// 201 로 세션을 만들고 SessionInfo 를 돌려준다.
// currentSceneId 는 내레이션 장면을 가리키므로, 대화 화면이 첫 대화 장면까지 걸어가야 한다
export function startSession(storyId: number, childId: number): Promise<SessionInfo> {
  return apiRequest<SessionInfo>(`/stories/${storyId}/sessions`, { body: { childId } });
}

export function getSession(sessionId: number): Promise<SessionInfo> {
  return apiRequest<SessionInfo>(`/sessions/${sessionId}`);
}
