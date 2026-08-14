import { ApiError } from '@/core/api/client';

// 백엔드 에러 응답에는 code 필드가 없어 HTTP 상태로 분기한다.
export function childErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // 400 = 정원 초과. 등록 가능 인원은 백엔드만 알고 있으므로
    // 숫자를 프론트에 복제하지 않고 서버 문구를 그대로 보여준다
    if (error.status === 400) return error.message;
    // 백엔드가 입력 검증 실패를 400 이 아니라 500 으로 돌려준다
    if (error.status >= 500) return '입력한 내용을 다시 확인해 주세요.';
    return error.message;
  }
  return '연결에 문제가 있어요. 네트워크를 확인해 주세요.';
}

/**
 * 세션 시작이 "아동 동의 없음"으로 막혔는지.
 *
 * 백엔드는 code 필드 없이 404 + "유효한 동의 정보를 찾을 수 없습니다." 만 준다
 * (StorySessionService, CHILD_004). 같은 404 라도 이야기·세션 없음과 문구가 달라
 * 메시지의 "동의" 로 구분한다 — 동의 화면이 생기기 전에 등록된 아이가 여기에 걸린다.
 */
export function isConsentMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && error.message.includes('동의');
}
