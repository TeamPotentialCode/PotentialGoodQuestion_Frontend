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
