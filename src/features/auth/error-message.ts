import { ApiError } from '@/core/api/client';

// 백엔드 에러 응답에는 code 필드가 없다(실측). HTTP 상태로 분기한다.
// 서버 원문 메시지를 그대로 노출하지 않는 이유: 아동 서비스라 문구 톤을 통제해야 하고,
// 검증 실패가 500 "서버 오류가 발생했습니다."로 오기 때문에 그대로 보여주면 오해를 준다
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '이메일 또는 비밀번호를 확인해 주세요.';
    if (error.status >= 500) return '잠시 후 다시 시도해 주세요.';
    return error.message;
  }
  return '연결에 문제가 있어요. 네트워크를 확인해 주세요.';
}

export function signupErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return '이미 가입된 이메일이에요.';
    // 백엔드가 입력 검증 실패를 500으로 돌려준다 — 클라이언트 검증으로 미리 막지만 안전망을 둔다
    if (error.status >= 500) return '입력한 내용을 다시 확인해 주세요.';
    return error.message;
  }
  return '연결에 문제가 있어요. 네트워크를 확인해 주세요.';
}
