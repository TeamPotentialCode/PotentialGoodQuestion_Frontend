'use client';

/*
 * 아이별로 "이미 담은 단어" 기록.
 *
 * 두 가지를 한다.
 * 1) 같은 단어를 또 눌렀을 때 요청 자체를 보내지 않는다 — 서버 왕복도 GPT 비용도 아끼고,
 *    이 백엔드가 중복을 409 로 줄지 500 으로 줄지에 기대지 않게 된다.
 * 2) 내레이션 ↔ 대화로 화면이 바뀌면 컴포넌트가 언마운트되는데, 그때 "담음" 표시가
 *    같이 날아가지 않게 한다. (watched-narrations.ts 와 같은 방식)
 * 저장이 막혀 있어도 최악은 표시가 안 남는 것뿐이라 조용히 넘긴다.
 */
const KEY = (childId: number) => `gq.wordsSaved.${childId}`;

export function markWordSaved(childId: number, word: string): void {
  try {
    const saved = new Set(JSON.parse(localStorage.getItem(KEY(childId)) ?? '[]') as string[]);
    saved.add(word);
    localStorage.setItem(KEY(childId), JSON.stringify([...saved]));
  } catch {
    // 이 기기에 기록이 안 남을 뿐, 서버 중복 판정이 남아 있다
  }
}

export function getSavedWords(childId: number): ReadonlySet<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(childId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
