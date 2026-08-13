'use client';

import { useEffect, useState } from 'react';

/**
 * 녹음 중일 때만 마이크 입력 크기를 읽어 온다 (0~1).
 *
 * "음성이 안 들어간다" 를 화면에서 바로 알 수 있게 하려는 것이다 —
 * 막대가 안 움직이면 장치 문제, 움직이는데 인식이 안 되면 STT 문제로 갈린다.
 */
export function useMicLevel(active: boolean, read: () => number): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      setLevel(read());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, read]);

  // 녹음 중이 아니면 0 — 이펙트에서 state 를 되돌리면 렌더가 한 번 더 돈다
  return active ? level : 0;
}
