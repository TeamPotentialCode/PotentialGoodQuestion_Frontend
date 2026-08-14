import { apiRequest } from '@/core/api/client';
import type { GrowthInfo, WordList } from '@/core/api/types';

/*
 * 단어장·성장 기록은 배포본 Swagger 에만 있고 로컬 백엔드 체크아웃에는 아직 없다.
 * 데모 브랜치에 없을 가능성이 있어 화면은 실패를 "아직 아무것도 없음"으로 읽는다 —
 * 시안도 이 두 화면은 빈 상태를 기본으로 그린다.
 */
const EMPTY_WORDS: WordList = { totalCount: 0, favoriteCount: 0, words: [] };

export async function getWords(childId: number): Promise<WordList> {
  try {
    return await apiRequest<WordList>(`/children/${childId}/words`);
  } catch {
    return EMPTY_WORDS;
  }
}

const EMPTY_GROWTH: GrowthInfo = {
  totalSessions: 0,
  completedSessions: 0,
  elementCounts: {},
  recentSessions: [],
};

export async function getGrowth(childId: number): Promise<GrowthInfo> {
  try {
    return await apiRequest<GrowthInfo>(`/children/${childId}/growth`);
  } catch {
    return EMPTY_GROWTH;
  }
}
