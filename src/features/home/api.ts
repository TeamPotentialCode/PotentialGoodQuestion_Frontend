import { apiRequest } from '@/core/api/client';
import type { HomeData } from '@/core/api/types';

// childId 는 백엔드가 필수로 요구한다. 남의 아이면 거부된다
export function getHome(childId: number): Promise<HomeData> {
  return apiRequest<HomeData>(`/home?childId=${childId}`);
}
