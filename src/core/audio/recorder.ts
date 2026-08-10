// 마이크 녹음. 순수 TS — react/next 를 import 하지 않는다(C-01 레이어 규칙).
// features/play/useAudioOwnership.ts 에서만 사용한다.

export interface Recording {
  /** 녹음을 멈추고 오디오 Blob 을 돌려준다. 마이크도 함께 해제한다 */
  stop: () => Promise<Blob>;
}

// 브라우저마다 지원 포맷이 다르다. 백엔드(Whisper)는 webm·mp4·m4a 를 모두 받는다
function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          // 순서가 중요하다: recorder 를 먼저 멈추고 그다음 트랙을 해제한다.
          // 반대로 하면 iOS 에서 재생 볼륨이 수화기 경로로 남아 복구되지 않는다
          stream.getTracks().forEach((track) => track.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
  };
}
