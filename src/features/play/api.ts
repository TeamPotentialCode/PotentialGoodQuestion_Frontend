import { apiRequest, apiRequestBlob } from '@/core/api/client';
import type { SttData, UtteranceData, UtteranceRequest } from '@/core/api/types';

export function transcribe(audio: Blob): Promise<SttData> {
  const form = new FormData();
  // 백엔드가 받는 파트 이름은 "audio" 다
  form.append('audio', audio, 'utterance.webm');
  return apiRequest<SttData>('/speech/stt', { body: form });
}

/** 봉투 없이 audio/mpeg 바이너리가 온다 */
export function synthesize(text: string): Promise<Blob> {
  return apiRequestBlob('/speech/tts', { body: { text } });
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
