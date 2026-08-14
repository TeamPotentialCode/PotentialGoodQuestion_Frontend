import { apiRequest, apiRequestBlob } from '@/core/api/client';
import type {
  NarrationResult,
  SttData,
  TtsVoice,
  UtteranceData,
  UtteranceRequest,
} from '@/core/api/types';

export function transcribe(audio: Blob): Promise<SttData> {
  const form = new FormData();
  // 백엔드가 받는 파트 이름은 "audio" 다
  form.append('audio', audio, 'utterance.webm');
  return apiRequest<SttData>('/speech/stt', { body: form });
}

/**
 * 봉투 없이 audio/mpeg 바이너리가 온다.
 * voice 를 생략하면 필드 없이 보낸다 — 서버 기본(nova)과 캐시 키를 그대로 쓴다
 */
export function synthesize(text: string, voice?: TtsVoice): Promise<Blob> {
  return apiRequestBlob('/speech/tts', { body: voice ? { text, voice } : { text } });
}

/** 내레이션 한 장을 다 봤다고 서버에 알린다 — 이어하기 위치가 정확해진다 */
export function completeNarrationScene(
  sessionId: number,
  sceneId: number,
): Promise<NarrationResult> {
  return apiRequest<NarrationResult>(`/sessions/${sessionId}/scenes/${sceneId}/narration-complete`, {
    method: 'POST',
    body: {},
  });
}

export function submitUtterance(
  sessionId: number,
  request: UtteranceRequest,
  idempotencyKey: string,
): Promise<UtteranceData> {
  return apiRequest<UtteranceData>(`/sessions/${sessionId}/utterances`, {
    body: request,
    idempotencyKey,
  });
}
