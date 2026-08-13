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

/*
 * useSyncExternalStore 의 getSnapshot 은 같은 값이면 **같은 참조**를 돌려줘야 한다.
 * 매번 JSON.parse 하면 새 객체가 나와 렌더가 무한히 돈다 — 파싱 결과를 캐시한다
 */
const cache = new Map<number, { raw: string | null; value: ActivityHandoff | null }>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeToHandoff(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveHandoff(sessionId: number, value: ActivityHandoff): void {
  try {
    sessionStorage.setItem(key(sessionId), JSON.stringify(value));
    cache.delete(sessionId);
    notify();
  } catch {
    // 저장이 막혀 있어도 이번 화면 전환은 메모리로 이어진다
  }
}

/** 저장된 인수인계. 없으면 null. 서버에서는 알 수 없으므로 undefined 를 쓴다 */
export function readHandoff(sessionId: number): ActivityHandoff | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key(sessionId));
  } catch {
    return null;
  }

  const hit = cache.get(sessionId);
  if (hit && hit.raw === raw) return hit.value;

  let value: ActivityHandoff | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as ActivityHandoff) : null;
    value = parsed && Array.isArray(parsed.submittedOrder) ? parsed : null;
  } catch {
    value = null;
  }
  cache.set(sessionId, { raw, value });
  return value;
}

/** 서버 렌더·하이드레이션 시점에는 sessionStorage 를 못 읽는다 = 아직 모름 */
export const handoffUnknownOnServer = () => undefined;
