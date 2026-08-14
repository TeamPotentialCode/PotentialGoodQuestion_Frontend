// 오디오 재생. 순수 TS — react/next 를 import 하지 않는다(C-01 레이어 규칙).
// features/play/useAudioOwnership.ts(재생)와 app/providers.tsx(프라이밍)에서만 사용한다.

export interface AudioPlayback {
  /** 재생이 끝나면 resolve. stop() 으로 중단해도, 재생이 막혀도 resolve 한다 */
  readonly done: Promise<void>;
  stop: () => void;
}

/*
 * WebKit(아이패드 사파리·크롬)은 **미디어 요소마다** 사용자 제스처를 요구한다.
 * 재생 때마다 새 Audio 요소를 만들면 TTS fetch 가 끝난 시점(제스처에서 몇 초 뒤)의
 * play() 가 조용히 거부돼 소리만 사라진다 — 실기기에서 "다시 듣기만 나오는" 원인.
 *
 * 그래서 재생은 **한 번 깨워둔 공유 AudioContext** 로 한다. 컨텍스트가 running 이면
 * 이후의 프로그램적 재생은 WebKit 도 허용한다. 깨우는 일(primeAudio)은
 * 아무 사용자 제스처 안에서 하면 된다 — providers 가 전역 pointerdown 에 걸어 둔다.
 */
let sharedContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    sharedContext ??= new AudioContext();
  } catch {
    return null; // 만들 수 없으면 HTMLAudio 폴백만 쓴다
  }
  return sharedContext;
}

// 이 문서에서 제스처를 한 번이라도 봤는지. userActivation API 가 없는 브라우저의 폴백 —
// 이것 없이 리다이렉트로 분기하면 상세 ↔ 플레이 무한 왕복이 된다
let gestureSeen = false;

/**
 * 사용자 제스처 안에서 호출해 오디오 재생 권한을 깨워 둔다.
 * iOS 는 백그라운드에 다녀오면 컨텍스트를 다시 suspend 하므로 여러 번 불려도 된다(멱등).
 */
export function primeAudio(): void {
  gestureSeen = true;
  const ctx = context();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

/** 이 문서에 사용자 제스처 이력이 있는지 — 자동재생을 시도해도 되는지의 근거 */
export function hasUserGesture(): boolean {
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) return true;
  return gestureSeen;
}

/** resume 이 제스처 없이는 영영 안 끝날 수 있다 — 잠깐만 기다려 보고 포기한다 */
async function tryResume(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true;
  await Promise.race([
    ctx.resume().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 300)),
  ]);
  // resume 이 상태를 바꿨을 수 있다 — TS 의 좁힘을 풀고 다시 읽는다
  return (ctx.state as AudioContextState) === 'running';
}

/** 구식 경로 — 컨텍스트를 못 쓰는 경우의 마지막 시도. 차단되면 조용히 완료된다 */
function playViaElement(blob: Blob, settle: () => void): { stop: () => void } {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  const cleanup = () => {
    audio.onended = null;
    audio.onerror = null;
    URL.revokeObjectURL(url);
    settle();
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  void audio.play().catch(cleanup);

  return {
    stop: () => {
      audio.pause();
      cleanup();
    },
  };
}

/**
 * Blob 을 재생한다.
 * 어떤 실패(디코드 불가·재생 차단)에도 done 은 반드시 resolve 된다 —
 * 여기서 매달리면 대화 흐름 전체가 멈춘다. 소리가 없는 쪽이 낫다.
 */
export function playBlob(blob: Blob): AudioPlayback {
  let settled = false;
  let settle: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    settle = () => {
      settled = true;
      resolve();
    };
  });

  let source: AudioBufferSourceNode | null = null;
  let fallback: { stop: () => void } | null = null;
  let stopped = false;

  void (async () => {
    const ctx = context();
    try {
      if (!ctx) throw new Error('no-audio-context');
      // 디코드를 먼저 한다 — 컨텍스트가 suspended 여도 디코드는 된다
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      if (stopped || settled) return;
      if (!(await tryResume(ctx))) throw new Error('context-not-running');
      if (stopped || settled) return;

      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      node.onended = () => {
        node.disconnect();
        settle();
      };
      source = node;
      node.start();
    } catch {
      // 컨텍스트가 못 깨어났거나(제스처 이력 없음) 디코드 실패 — 요소 재생으로 마지막 시도
      if (stopped || settled) return;
      fallback = playViaElement(blob, settle);
    }
  })();

  return {
    done,
    stop: () => {
      stopped = true;
      try {
        source?.stop(); // onended 가 settle 을 부른다
      } catch {
        settle();
      }
      fallback?.stop();
      if (!source && !fallback) settle(); // 디코드 중에 멈춘 경우
    },
  };
}
