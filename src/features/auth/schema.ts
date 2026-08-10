import { z } from 'zod';

// 백엔드 검증 규칙과 맞춘다: 이메일 형식, 이름 50자 이하, 비밀번호 8자 이상.
// 백엔드는 검증 실패를 500으로 돌려주므로 여기서 반드시 먼저 막아야 한다
const email = z.string().min(1, '이메일을 입력해 주세요.').email('이메일 형식이 올바르지 않아요.');
const password = z.string().min(8, '비밀번호는 8자 이상이어야 해요.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export const signupSchema = z.object({
  email,
  name: z.string().min(1, '이름을 입력해 주세요.').max(50, '이름은 50자 이하로 입력해 주세요.'),
  password,
});

export type FieldErrors = Record<string, string>;

/** zod 결과를 필드명→첫 오류 메시지 맵으로 바꾼다. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}
