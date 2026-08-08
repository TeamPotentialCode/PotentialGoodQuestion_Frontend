// TTS 목 응답용 무음 mp3 바이트.
// MPEG-1 Layer III 128kbps/44.1kHz 프레임(417바이트, 헤더 0xFF 0xFB 0x90 0x64) 반복 —
// 페이로드가 0이면 무음으로 디코드된다. 프레임당 약 26ms, 기본 20프레임 ≈ 0.5초
const FRAME_SIZE = 417;
const FRAME_HEADER = [0xff, 0xfb, 0x90, 0x64];

export function silentMp3(frames = 20): Uint8Array {
  const bytes = new Uint8Array(FRAME_SIZE * frames);
  for (let f = 0; f < frames; f += 1) {
    bytes.set(FRAME_HEADER, f * FRAME_SIZE);
  }
  return bytes;
}
