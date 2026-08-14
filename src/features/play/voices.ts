import type { TtsVoice } from '@/core/api/types';

/*
 * 캐릭터별 TTS 목소리 — 배정을 바꾸려면 이 파일만 고친다.
 *
 * 장면마다 캐릭터가 달라서 목소리를 고정하지 않으면 며느리와 시아버지가
 * 같은 목소리로 말한다. 백엔드는 voice 파라미터만 받고 매핑은 프론트 몫이다.
 */

/** 내레이션·장면 설명·이야기 소개 — 그림책 읽어주는 이야기꾼 톤 */
export const NARRATOR_VOICE: TtsVoice = 'fable';

const CHARACTER_VOICES: Record<string, TtsVoice> = {
  며느리: 'shimmer', // 여성적, 부드럽고 따뜻함
  시아버지: 'onyx', // 남성적, 깊고 묵직함 (백엔드 추천)
  '마을 이장': 'echo', // 남성적, 낮고 부드러움 — 시아버지와 구분
};

/** 모르는 캐릭터는 undefined — voice 를 생략해 서버 기본(nova)으로 안전하게 간다 */
export function characterVoice(name: string): TtsVoice | undefined {
  return CHARACTER_VOICES[name];
}
