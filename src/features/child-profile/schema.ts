import { z } from 'zod';
import type { ChildUpsertRequest } from '@/core/api/types';

/*
 * 백엔드는 birthYear 를 2000~2030 으로 검증한다(나이로는 최대 26살).
 * 유아 대상 서비스라 그 상한은 의미가 없어 화면은 1~20살에 해당하는 연도로 더 좁게 막는다 —
 * 허용 범위 안쪽이라 안전하다. 백엔드는 범위를 벗어나면 400이 아니라 500을 돌려주므로 여기서 반드시 먼저 막는다.
 */
const CURRENT_YEAR = new Date().getFullYear();
const OLDEST_YEAR = CURRENT_YEAR - 20;
const YOUNGEST_YEAR = CURRENT_YEAR - 1;

/** yyyy-mm-dd 인지, 실제로 존재하는 날짜인지 */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const childSchema = z.object({
  name: z.string().min(1, '아이 이름을 입력해 주세요.').max(50, '이름은 50자 이하로 입력해 주세요.'),
  // 시안 v4 는 나이 칩 대신 생년월일을 받는다. 백엔드에는 연도만 보낸다
  birthDate: z
    .string()
    .min(1, '생년월일을 입력해 주세요.')
    .refine(isCalendarDate, '생년월일을 다시 확인해 주세요.')
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= OLDEST_YEAR && year <= YOUNGEST_YEAR;
    }, `${OLDEST_YEAR}년 ~ ${YOUNGEST_YEAR}년 사이로 입력해 주세요.`),
});

export type ChildInput = z.infer<typeof childSchema>;

/** 화면의 생년월일을 백엔드가 받는 출생연도로 바꾼다 */
export function toUpsertRequest(input: ChildInput): ChildUpsertRequest {
  return { name: input.name, birthYear: Number(input.birthDate.slice(0, 4)) };
}

/** "2018. 03. 14." — 시안이 동의 화면에서 쓰는 표기 */
export function formatBirthDate(value: string): string {
  if (!isCalendarDate(value)) return value;
  const [y, m, d] = value.split('-');
  return `${y}. ${m}. ${d}.`;
}
