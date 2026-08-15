import { ApiError } from '@/core/api/client';

/** 단어 담기 결과 — 화면이 토큰 색을 정하는 데 쓴다 */
export type WordSaveOutcome = 'duplicate' | 'error';

/**
 * 이미 담은 단어인지.
 *
 * 계약상으로는 409(WORD_003)지만 이 백엔드는 에러 code 를 안 주고
 * 검증 실패를 500 으로 돌려준 전력이 있다. 그래서 상태만 보지 않고 문구도 함께 본다.
 * (진짜 방어는 화면 쪽 — 이미 담은 단어는 요청 자체를 보내지 않는다)
 */
export function isDuplicateWord(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409) return true;
  return error.status >= 500 && /이미|중복/.test(error.message);
}

export function wordSaveOutcome(error: unknown): WordSaveOutcome {
  return isDuplicateWord(error) ? 'duplicate' : 'error';
}

/** 아이가 읽는 문구다 — 서버 원문을 그대로 노출하지 않는다 */
export function wordSaveMessage(error: unknown): string {
  return isDuplicateWord(error) ? '이미 담아 뒀어!' : '지금은 못 담았어. 다시 눌러 줄래?';
}
