import { z } from 'zod';
import type { ChildUpsertRequest } from '@/core/api/types';

/*
 * 백엔드는 birthYear 를 2000~2030 으로 검증한다(나이로는 최대 26살).
 * 유아 대상 서비스라 그 상한은 의미가 없어 화면은 1~20으로 더 좁게 막는다 — 허용 범위 안쪽이라 안전하다.
 * 백엔드는 범위를 벗어나면 400이 아니라 500을 돌려주므로 여기서 반드시 먼저 막는다.
 */
const CURRENT_YEAR = new Date().getFullYear();

export const childSchema = z.object({
  name: z.string().min(1, '아이 이름을 입력해 주세요.').max(50, '이름은 50자 이하로 입력해 주세요.'),
  age: z
    .number({ message: '나이를 숫자로 입력해 주세요.' })
    .int('나이는 정수로 입력해 주세요.')
    .min(1, '나이는 1살 이상이어야 해요.')
    .max(20, '나이는 20살 이하여야 해요.'),
});

export type ChildInput = z.infer<typeof childSchema>;

/** 화면의 나이를 백엔드가 받는 출생연도로 바꾼다 */
export function toUpsertRequest(input: ChildInput): ChildUpsertRequest {
  return { name: input.name, birthYear: CURRENT_YEAR - input.age };
}
