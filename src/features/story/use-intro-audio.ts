'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesize } from '@/features/play/api';
import { useAudioOwnership } from '@/features/play/useAudioOwnership';
import { NARRATOR_VOICE } from '@/features/play/voices';

/**
 * 이야기 소개를 소리로 들려준다 (상세의 "이야기 듣기").
 *
 * 같은 문장을 다시 들을 때 TTS 를 또 부르지 않도록 받아둔 음성을 재사용한다.
 * 재생 중 다시 누르면 멈춘다 — 아이가 빠져나올 방법이 있어야 한다.
 */
export function useIntroAudio(text: string) {
  const audio = useAudioOwnership();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const cached = useRef<Blob | null>(null);
  // 합성 중 화면을 떠나면 재생을 시작하지 않는다 (오디오는 모듈 전역이라 떠나도 소리가 난다)
  const aliveRef = useRef(true);

  useEffect(() => {
    cached.current = null;
  }, [text]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      audio.releaseAll();
    };
  }, [audio]);

  const toggle = useCallback(() => {
    if (state === 'playing') {
      audio.stopPlayback();
      setState('idle');
      return;
    }
    if (!text || state === 'loading') return;

    setState('loading');
    void (async () => {
      try {
        cached.current ??= await synthesize(text, NARRATOR_VOICE);
        if (!aliveRef.current) return;
        setState('playing');
        await audio.play(cached.current);
      } catch {
        // 소리가 안 나와도 화면은 그대로 둔다 — 글로 읽을 수 있다
      } finally {
        setState('idle');
      }
    })();
  }, [audio, state, text]);

  return { state, toggle };
}
