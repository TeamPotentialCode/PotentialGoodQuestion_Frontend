import { ApiError } from '@/core/api/client';

/**
 * 활동을 못 불러온 이유를 아이·보호자가 알아볼 문구로 바꾼다.
 *
 * 실백엔드는 남의 세션에 403, 없는 세션에 404 를 준다.
 * 둘을 같은 문구로 뭉뚱그리면 원인을 알 수 없다 — 실제로 세션 번호를 잘못 넣고 한참 헤맸다.
 */
export function activityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return '이 이야기를 볼 수 있는 계정이 아니에요.';
    if (error.status === 404) return '이야기를 찾지 못했어요. 홈에서 다시 시작해 줄래?';
    if (error.status === 401) return '로그인이 풀렸어요. 다시 로그인해 주세요.';
  }
  return '활동을 불러오지 못했어요.';
}
