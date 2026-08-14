// 오디오 재생. 순수 TS — react/next 를 import 하지 않는다(C-01 레이어 규칙).
// features/play/useAudioOwnership.ts(재생)와 app/providers.tsx(프라이밍·진단)에서만 사용한다.

export interface AudioPlayback {
  /** 재생이 끝나면 resolve. stop() 으로 중단해도, 재생이 막혀도 resolve 한다 */
  readonly done: Promise<void>;
  stop: () => void;
}

/*
 * WebKit(아이패드 사파리·크롬)은 **미디어 요소마다** 사용자 제스처를 요구하고,
 * 마이크가 오디오 세션을 바꿀 때 재생 컨텍스트를 비표준 상태 'interrupted' 로 떨어뜨린다.
 *
 * 대응 3중장치:
 *  1. 공유 AudioContext — 제스처마다 resume + **무음 버퍼 실제 재생**으로 해제를 고정
 *  2. 축복 요소 — 제스처 안에서 한 번 play() 해 둔 HTMLAudio 하나를 폴백으로 재사용
 *  3. 녹음 종료 직후 recoverAudio() — 세션이 재생 모드로 돌아온 순간 프로그램적 회복
 */
let sharedContext: AudioContext | null = null;

/** WebKit 진단용 — 마지막 재생 경로·상태를 남긴다 (#audio-debug 오버레이가 읽는다) */
export const audioDiag = {
  path: '아직 없음' as string,
  error: '' as string,
  contextState: (): string => sharedContext?.state ?? '컨텍스트 없음',
};

/*
 * 사건 로그 — 실기기(아이패드)에는 콘솔이 없어서, 오버레이 스크린샷 한 장으로
 * "무슨 순서로 무엇이 실패했는지" 를 읽을 수 있게 최근 사건을 굴려 담는다.
 * #audio-debug 가 켜져 있으면 콘솔에도 같이 남긴다(데스크톱 디버깅용)
 */
const LOG_MAX = 60;
export const audioLog: string[] = [];

function debugOverlayOn(): boolean {
  return typeof window !== 'undefined' && window.location.hash.includes('audio-debug');
}

function alog(message: string): void {
  const stamp = typeof performance !== 'undefined' ? `${(performance.now() / 1000).toFixed(1)}s` : '';
  audioLog.push(`${stamp} ${message}`);
  if (audioLog.length > LOG_MAX) audioLog.shift();
  if (debugOverlayOn()) console.info('[오디오]', message);
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedContext) {
      sharedContext = new AudioContext();
      alog(`컨텍스트 생성 (state=${sharedContext.state}, rate=${sharedContext.sampleRate})`);
      sharedContext.addEventListener('statechange', () => {
        alog(`컨텍스트 상태 변화 → ${sharedContext?.state}`);
      });
    }
  } catch (error) {
    alog(`컨텍스트 생성 실패: ${String(error)}`);
    return null; // 만들 수 없으면 HTMLAudio 폴백만 쓴다
  }
  return sharedContext;
}

/** recorder 의 레벨 미터가 같은 컨텍스트를 쓴다 — 턴마다 만들고 닫으면 iOS 세션이 흔들린다 */
export function sharedAudioContext(): AudioContext | null {
  return context();
}

// 이 문서에서 제스처를 한 번이라도 봤는지. userActivation API 가 없는 브라우저의 폴백 —
// 이것 없이 리다이렉트로 분기하면 상세 ↔ 플레이 무한 왕복이 된다
let gestureSeen = false;

/*
 * 축복 요소: 제스처 안에서 무음을 한 번 재생해 둔 HTMLAudio.
 * WebKit 은 "재생된 적 있는 요소"의 이후 프로그램적 play() 는 허용한다.
 * 무음 mp3 는 외부 자원 없이 만든다 (mocks 의 silent-audio 와 같은 프레임 방식)
 */
let blessedElement: HTMLAudioElement | null = null;

function silentMp3Url(): string {
  const FRAME_SIZE = 417; // MPEG-1 Layer III 128kbps/44.1kHz, 페이로드 0 = 무음
  const bytes = new Uint8Array(FRAME_SIZE * 2); // 2프레임 ≈ 52ms
  bytes.set([0xff, 0xfb, 0x90, 0x64], 0);
  bytes.set([0xff, 0xfb, 0x90, 0x64], FRAME_SIZE);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
}

function blessElement(): void {
  if (blessedElement) return;
  try {
    const el = new Audio(silentMp3Url());
    el.volume = 0;
    void el
      .play()
      .then(() => {
        el.pause();
        el.volume = 1;
        alog('요소 축복 성공 — 폴백 재생 경로 확보');
      })
      .catch((error: unknown) => {
        // 축복 실패 — 다음 제스처에서 다시 시도한다
        alog(`요소 축복 실패: ${String(error)}`);
        blessedElement = null;
      });
    blessedElement = el;
  } catch (error) {
    alog(`요소 축복 예외: ${String(error)}`);
    blessedElement = null;
  }
}

/** 제스처 안에서 컨텍스트에 실제 재생 이력을 남긴다 — resume 만으로는 해제가 안 붙는 iOS 대비 */
function playSilentKick(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * 0.05)), ctx.sampleRate);
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    node.start();
    alog('무음 킥 재생 (해제 고정)');
  } catch (error) {
    // 실패해도 resume 은 이미 시도했다
    alog(`무음 킥 실패: ${String(error)}`);
  }
}

/**
 * 사용자 제스처 안에서 호출해 오디오 재생 권한을 깨워 둔다.
 * iOS 는 마이크 사용·백그라운드 복귀 때 컨텍스트를 'interrupted'/'suspended' 로
 * 되돌리므로 running 이 아니면 전부 되살린다. 여러 번 불려도 된다(멱등).
 */
export function primeAudio(): void {
  gestureSeen = true;
  blessElement();
  const ctx = context();
  if (!ctx) return;
  if (ctx.state !== 'running') {
    const before = ctx.state;
    alog(`제스처 프라임 — resume 시도 (${before})`);
    void ctx
      .resume()
      .then(() => {
        alog(`제스처 resume 결과: ${before} → ${ctx.state}`);
        playSilentKick(ctx);
      })
      .catch((error: unknown) => alog(`제스처 resume 실패: ${String(error)}`));
  }
}

/**
 * 제스처 밖에서의 회복 시도 — 녹음이 끝나 세션이 재생 모드로 돌아온 직후 등.
 * iOS 가 거부해도 무해하다. 다음 재생의 tryResume 이 한 번 더 시도한다
 */
export function recoverAudio(): void {
  const ctx = sharedContext;
  if (ctx && ctx.state !== 'running') {
    const before = ctx.state;
    alog(`프로그램적 회복 시도 (${before})`);
    void ctx
      .resume()
      .then(() => alog(`회복 결과: ${before} → ${ctx.state}`))
      .catch((error: unknown) => alog(`회복 실패: ${String(error)}`));
  }
}

// iOS 는 백그라운드에 다녀오면 컨텍스트를 재운다 — 복귀 시 프로그램적 회복을 시도한다
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      alog('화면 복귀 — 컨텍스트 점검');
      recoverAudio();
    }
  });
}

/** 이 문서에 사용자 제스처 이력이 있는지 — 자동재생을 시도해도 되는지의 근거 */
export function hasUserGesture(): boolean {
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) return true;
  return gestureSeen;
}

/** resume 이 제스처 없이는 영영 안 끝날 수 있다 — 잠깐만 기다려 보고 포기한다 */
async function tryResume(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true;
  // 'suspended' 든 WebKit 의 'interrupted' 든 시도는 같다
  await Promise.race([
    ctx.resume().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]);
  // resume 이 상태를 바꿨을 수 있다 — TS 의 좁힘을 풀고 다시 읽는다
  return (ctx.state as AudioContextState) === 'running';
}

/**
 * 요소 재생 폴백 — 컨텍스트를 못 쓰는 경우.
 * 제스처 때 축복해 둔 요소가 있으면 그것을 재사용한다(iOS 가 허용하는 유일한 요소 경로).
 * 없으면 새 요소로 시도 — 데스크톱에서는 이것도 통한다
 */
function playViaElement(blob: Blob, settle: () => void): { stop: () => void } {
  const url = URL.createObjectURL(blob);
  const audio = blessedElement ?? new Audio();
  audioDiag.path = blessedElement ? '요소(축복됨)' : '요소(새로 생성)';
  alog(`${audioDiag.path} 재생 시도 (${Math.round(blob.size / 1024)}KB)`);

  const cleanup = () => {
    audio.onended = null;
    audio.onerror = null;
    URL.revokeObjectURL(url);
    settle();
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  audio.src = url;
  void audio
    .play()
    .then(() => alog('요소 재생 시작 ✓'))
    .catch((error: unknown) => {
      audioDiag.error = `요소 재생 거부: ${String(error)}`;
      alog(audioDiag.error);
      cleanup();
    });

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
      alog(`재생 요청 (${Math.round(blob.size / 1024)}KB, ctx=${ctx.state})`);
      // 디코드를 먼저 한다 — 컨텍스트가 suspended 여도 디코드는 된다
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      if (stopped || settled) return;
      if (!(await tryResume(ctx))) throw new Error(`context-${ctx.state}`);
      if (stopped || settled) return;

      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      node.onended = () => {
        node.disconnect();
        settle();
        alog('WebAudio 재생 종료');
      };
      source = node;
      audioDiag.path = 'WebAudio';
      audioDiag.error = '';
      node.start();
      alog(`WebAudio 재생 시작 ✓ (${buffer.duration.toFixed(1)}초 분량)`);
    } catch (error) {
      // 컨텍스트가 못 깨어났거나(제스처 이력 없음·interrupted) 디코드 실패 — 요소로 마지막 시도
      audioDiag.error = String(error);
      alog(`WebAudio 경로 실패: ${String(error)} → 요소 폴백`);
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
