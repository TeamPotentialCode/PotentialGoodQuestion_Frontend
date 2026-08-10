// 오디오 재생. 순수 TS — react/next 를 import 하지 않는다(C-01 레이어 규칙).
// features/play/useAudioOwnership.ts 에서만 사용한다.

export interface AudioPlayback {
  /** 재생이 끝나면 resolve. stop() 으로 중단해도 resolve 한다 */
  readonly done: Promise<void>;
  stop: () => void;
}

/**
 * Blob 을 재생한다.
 * 브라우저 자동재생 정책 때문에 첫 재생 전에 사용자 제스처가 한 번 있어야 한다
 * (상태 머신의 locked → TAP_UNLOCK 가 그 역할을 한다).
 */
export function playBlob(blob: Blob): AudioPlayback {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let settle: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const cleanup = () => {
    audio.onended = null;
    audio.onerror = null;
    URL.revokeObjectURL(url);
    settle();
  };

  audio.onended = cleanup;
  // 재생 실패도 완료로 처리한다 — 음성이 안 나와도 대화는 이어져야 한다
  audio.onerror = cleanup;

  void audio.play().catch(cleanup);

  return {
    done,
    stop: () => {
      audio.pause();
      cleanup();
    },
  };
}
