'use client';

import { useCallback, useMemo, useRef } from 'react';
import { playBlob, type AudioPlayback } from '@/core/audio/player';
import { startRecording, type Recording } from '@/core/audio/recorder';

// 자동재생을 시도해도 되는지의 판단 근거. 재생 제어가 아니라 조회라 여기서 재수출한다
export { hasUserGesture } from '@/core/audio/player';

/**
 * 오디오 하드웨어를 다루는 유일한 지점(ESLint C-01: @/core/audio 는 이 파일에서만 import).
 *
 * 마이크와 스피커가 동시에 켜지지 않도록 여기서 강제한다 —
 * 상태 머신의 hardwareOwner(phase) 가 단일값이라 애초에 두 개가 동시에 요구되지 않지만,
 * 실제 자원 해제 순서까지 지키는 건 이 훅의 몫이다.
 */
export function useAudioOwnership() {
  const recordingRef = useRef<Recording | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  // getUserMedia 가 끝나기 전에 "보내기"를 누르면 빈 녹음이 된다.
  // 시작 중인 약속을 들고 있다가 정지 시 먼저 기다린다
  const startingRef = useRef<Promise<void> | null>(null);

  const stopPlayback = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, []);

  /** 재생이 끝날 때까지 기다린다. 재생 중이면 이전 것을 먼저 끊는다 */
  const play = useCallback(
    async (blob: Blob) => {
      stopPlayback();
      const playback = playBlob(blob);
      playbackRef.current = playback;
      await playback.done;
      if (playbackRef.current === playback) playbackRef.current = null;
    },
    [stopPlayback],
  );

  const startMic = useCallback(async () => {
    stopPlayback(); // 마이크를 켜기 전에 스피커를 반드시 놓는다
    const starting = startRecording().then((recording) => {
      recordingRef.current = recording;
    });
    startingRef.current = starting;
    try {
      await starting;
    } finally {
      if (startingRef.current === starting) startingRef.current = null;
    }
  }, [stopPlayback]);

  /** 녹음을 멈추고 Blob 을 돌려준다. 마이크 해제까지 끝난 뒤 반환된다 */
  const stopMic = useCallback(async (): Promise<Blob | null> => {
    // 아직 시작 중이면 끝나기를 기다린다 — 그러지 않으면 빈 녹음이 된다
    await startingRef.current?.catch(() => {});
    const recording = recordingRef.current;
    if (!recording) return null;
    recordingRef.current = null;
    return recording.stop();
  }, []);

  /** 지금 마이크로 들어오는 소리 크기 (0~1). 녹음 중이 아니면 0 */
  const micLevel = useCallback(() => recordingRef.current?.level() ?? 0, []);

  /** 화면을 벗어날 때 남은 자원을 정리한다 */
  const releaseAll = useCallback(() => {
    stopPlayback();
    void recordingRef.current?.stop();
    recordingRef.current = null;
    startingRef.current = null;
  }, [stopPlayback]);

  // 반환 객체를 고정한다. 매 렌더마다 새 객체를 주면 이걸 의존성으로 쓰는 정리 이펙트가
  // 렌더마다 재실행되어 녹음이 곧바로 끊긴다
  return useMemo(
    () => ({ play, stopPlayback, startMic, stopMic, micLevel, releaseAll }),
    [play, stopPlayback, startMic, stopMic, micLevel, releaseAll],
  );
}
