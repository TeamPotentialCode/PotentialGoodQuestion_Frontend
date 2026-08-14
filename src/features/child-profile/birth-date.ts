'use client';

/*
 * 백엔드는 **출생연도만** 저장한다(ChildRequestDto 는 birthYear 하나뿐).
 * 그런데 시안은 생년월일을 받고 동의 화면에 "민준 · 2018.03.14. (8세)" 로 되짚어 준다.
 * 그 사이를 메우려고 전체 생년월일을 이 기기에만 남겨 둔다 —
 * 지워져도 연도는 서버에 있으므로 나이 계산과 이야기 추천에는 지장이 없다.
 */
const KEY = (childId: number) => `gq.childBirthDate.${childId}`;

export function saveBirthDate(childId: number, isoDate: string): void {
  try {
    localStorage.setItem(KEY(childId), isoDate);
  } catch {
    // 저장이 막혀 있으면 연도만으로 표시한다
  }
}

/** 없으면 null — 화면은 birthYear 로 대신 표시한다 */
export function readBirthDate(childId: number): string | null {
  try {
    return localStorage.getItem(KEY(childId));
  } catch {
    return null;
  }
}
