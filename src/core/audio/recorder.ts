// 마이크 녹음. 순수 TS — react/next 를 import 하지 않는다(C-01 레이어 규칙).
// features/play/useAudioOwnership.ts 에서만 사용한다.

export interface Recording {
  /** 녹음을 멈추고 오디오 Blob 을 돌려준다. 마이크도 함께 해제한다 */
  stop: () => Promise<Blob>;
  /** 지금 마이크로 들어오는 소리 크기 (0~1). 화면이 "들어오고 있음"을 보여주는 데 쓴다 */
  level: () => number;
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

  // 입력 크기 측정용. 녹음 자체와는 무관하고, 실패해도 녹음은 그대로 진행한다
  let context: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let samples: Float32Array<ArrayBuffer> | null = null;
  try {
    context = new AudioContext();
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    samples = new Float32Array(analyser.fftSize);
  } catch {
    context = null;
  }

  return {
    level: () => {
      if (!analyser || !samples) return 0;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      // 말소리 RMS 는 대략 0.05~0.2 다. 눈에 보이게 5배 키우고 1 에서 자른다
      return Math.min(1, Math.sqrt(sum / samples.length) * 5);
    },
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          // 순서가 중요하다: recorder 를 먼저 멈추고 그다음 트랙을 해제한다.
          // 반대로 하면 iOS 에서 재생 볼륨이 수화기 경로로 남아 복구되지 않는다
          stream.getTracks().forEach((track) => track.stop());
          // 안 닫으면 탭에 AudioContext 가 쌓인다(브라우저당 개수 제한이 있다)
          void context?.close();
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
  };
}
