'use client';

/*
 * 세션별로 "이미 본 내레이션 장면" 기록.
 *
 * 서버 커서(currentSceneId)는 장면 하나만 가리켜서, 커서가 대화 장면일 때
 * "그 앞 내레이션을 봤는지"(재개) vs "안 봤는지"(직전 대화를 마치고 막 넘어옴)를
 * 구분할 수 없다 — 그래서 내레이션 1/6 부터 다시 시작하는 문제가 있었다.
 * narration-complete 를 쏘는 쪽이 프론트이므로 같은 시점에 기기에도 기록한다.
 * localStorage 라 새로고침·재방문을 견디고, 지워져도 최악은 재생 몇 장 반복이다.
 */
const KEY = (sessionId: number) => `gq.narrationsSeen.${sessionId}`;

export function markNarrationWatched(sessionId: number, sceneId: number): void {
  try {
    const seen = new Set(JSON.parse(localStorage.getItem(KEY(sessionId)) ?? '[]') as number[]);
    seen.add(sceneId);
    localStorage.setItem(KEY(sessionId), JSON.stringify([...seen]));
  } catch {
    // 저장이 막혀 있으면 서버 커서 규칙만으로 동작한다
  }
}

export function getWatchedNarrations(sessionId: number): ReadonlySet<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(sessionId)) ?? '[]') as number[]);
  } catch {
    return new Set();
  }
}
