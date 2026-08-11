'use client';

/**
 * 순서 맞추기 → 다시 말하기 사이의 인수인계.
 *
 * 핵심 단어는 **정답 제출 응답으로만** 온다. 다시 말하기 화면에서 새로고침하면
 * 다시 받아올 방법이 없어서(정답 순서를 서버만 안다) sessionStorage 에 남긴다.
 * 탭을 닫으면 사라지는 게 맞는 값이라 localStorage 가 아니라 sessionStorage 다.
 */
export interface ActivityHandoff {
  /** 정답으로 판정된 카드 순서. 다시 말하기 제출 때 함께 보내야 한다 */
  submittedOrder: string[];
  retellingKeywords: string[];
}

const key = (sessionId: number) => `gq.activity.${sessionId}`;

export function saveHandoff(sessionId: number, value: ActivityHandoff): void {
  try {
    sessionStorage.setItem(key(sessionId), JSON.stringify(value));
  } catch {
    // 저장이 막혀 있어도 이번 화면 전환은 메모리로 이어진다
  }
}

export function readHandoff(sessionId: number): ActivityHandoff | null {
  try {
    const raw = sessionStorage.getItem(key(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityHandoff;
    return Array.isArray(parsed.submittedOrder) ? parsed : null;
  } catch {
    return null;
  }
}
