import { apiRequest } from '@/core/api/client';
import type { GrowthInfo, WordInfo, WordList, WordSaveRequest } from '@/core/api/types';

/*
 * 쿼리 키를 한곳에서 만든다.
 * 단어를 담으면 words 와 growth(wordStats) 가 함께 낡는데, 키를 화면마다 손으로 적으면
 * childId 가 number 냐 undefined 냐에 따라 어긋나 무효화가 조용히 빗나간다.
 */
export const wordsKey = (childId: number | undefined) => ['words', childId] as const;
export const growthKey = (childId: number | undefined) => ['growth', childId] as const;

/*
 * 아래 조회들은 실패를 삼키지 않는다.
 * 예전에는 API 가 없는 브랜치를 대비해 빈 값으로 떨어뜨렸는데, 그러면 react-query 가
 * "성공 + 빈 목록" 으로 캐시를 덮어써서 방금 담은 단어가 조용히 사라진다.
 * 화면은 이미 `?? []` 로 방어하므로 던져도 빈 상태 그림은 그대로다.
 */
export async function getWords(childId: number): Promise<WordList> {
  return apiRequest<WordList>(`/children/${childId}/words`);
}

export async function getGrowth(childId: number): Promise<GrowthInfo> {
  return apiRequest<GrowthInfo>(`/children/${childId}/growth`);
}

/** 저장 시점에 백엔드가 GPT 로 뜻·예시를 만든다 — 느릴 수 있고 실패하면 그 두 필드가 null 로 온다 */
export async function saveWord(childId: number, request: WordSaveRequest): Promise<WordInfo> {
  return apiRequest<WordInfo>(`/children/${childId}/words`, { method: 'POST', body: request });
}

/** 경로가 children 하위가 아니다 (백엔드 계약) */
export async function toggleWordFavorite(wordId: number): Promise<WordInfo> {
  return apiRequest<WordInfo>(`/words/${wordId}/favorite`, { method: 'PATCH' });
}
