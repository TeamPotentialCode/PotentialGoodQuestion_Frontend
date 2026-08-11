'use client';

// 임시 개발 확인 페이지 — 프리미티브 갤러리 + MSW 목 콘솔.
// 반응형·오류 UX 전에 삭제한다. prod 빌드에서는 404.
import { notFound } from 'next/navigation';
import { useRef, useState } from 'react';
import type {
  ActivityCardSet,
  ActivityResult,
  ApiEnvelope,
  AuthTokens,
  ReportData,
  SessionInfo,
  SttData,
  UtteranceData,
} from '@/core/api/types';
import type { ScenarioName } from '@/mocks/scenario';
import { Character, Screen, SpeechBubble, Stack, TouchTarget } from '@/shared/ui';

const SCENARIOS: ScenarioName[] = [
  'happy',
  'stt-empty',
  'stt-fail-once',
  'stt-fail-always',
  'analysis-fail-once',
  'expired-token',
  'slow-network',
];

export default function DevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DevConsole />;
}

function DevConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<string>('');
  const sessionRef = useRef<number | null>(null);
  const sceneRef = useRef<number | null>(null);

  const log = (line: string) => setLogs((prev) => [...prev.slice(-30), line]);

  // 연타로 턴이 겹치면 STT 가 장면 전환 전 상태를 읽는다 — 진행 중에는 버튼을 잠근다
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
    const res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.body && typeof init.body === 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
        ...init?.headers,
      },
    });
    if (res.headers.get('Content-Type')?.includes('audio/mpeg')) {
      const buf = await res.arrayBuffer();
      log(`← ${path} audio/mpeg ${buf.byteLength} bytes`);
      const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })));
      void audio.play().catch(() => log('(오디오 자동재생 차단됨)'));
      return null;
    }
    const body = (await res.json()) as ApiEnvelope<T>;
    log(`← ${path} ${res.status} ${body.success ? 'OK' : body.message}`);
    return body.data;
  }

  const login = async () => {
    const data = await call<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'demo@goodquestion.dev', password: 'demo1234!' }),
    });
    if (data) {
      tokenRef.current = data.accessToken;
      log(`로그인: ${data.name} (parentId ${data.parentId})`);
    }
  };

  const createSession = async () => {
    const data = await call<SessionInfo>('/stories/1/sessions', {
      method: 'POST',
      body: JSON.stringify({ childId: 1 }),
    });
    if (data) {
      sessionRef.current = data.sessionId;
      sceneRef.current = data.currentSceneId;
      log(`세션 ${data.sessionId} — 현재 장면 ${data.currentSceneId} (${data.childName})`);
    }
  };

  const oneTurn = async (overrideText?: string) => {
    if (!sessionRef.current || !sceneRef.current) {
      log('먼저 세션을 만들어 주세요');
      return;
    }
    let text = overrideText;
    if (!text) {
      const form = new FormData();
      form.append('audio', new Blob([new Uint8Array(64)], { type: 'audio/webm' }), 'voice.webm');
      const stt = await call<SttData>('/speech/stt', { method: 'POST', body: form });
      if (!stt || !stt.text) {
        log('STT 실패/빈 텍스트 — 턴 중단');
        return;
      }
      text = stt.text;
    }
    log(`발화: "${text}"`);
    const result = await call<UtteranceData>(`/sessions/${sessionRef.current}/utterances`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ sceneId: sceneRef.current, text, sttRawText: text }),
    });
    if (!result) return;
    const p = result.progressResult;
    log(
      `→ ${p.mode} | 누적 [${p.accumulatedElements.join(',')}] | 부족 [${p.missingElements.join(',')}]${result.showMission ? ' | 미션!' : ''}`,
    );
    log(`캐릭터: "${result.characterMessage.text}"`);
    if (result.sceneCompleted) {
      if (result.nextSceneId === null) {
        log('이야기 완료! → 사후 활동으로');
      } else {
        const detail = await call<SessionInfo>(`/sessions/${sessionRef.current}`);
        if (detail) {
          sceneRef.current = detail.currentSceneId;
          log(`다음 장면 ${detail.currentSceneId}`);
        }
      }
    }
  };

  const postActivity = async () => {
    if (!sessionRef.current) return;
    const set = await call<ActivityCardSet>(`/sessions/${sessionRef.current}/activity`, {
      method: 'POST',
      body: '{}',
    });
    log(`카드 ${set?.cards.length}장: [${set?.cards.map((c) => c.text.slice(0, 6)).join(' / ')}]`);

    const answer = ['card_1', 'card_2', 'card_3', 'card_4', 'card_5'];
    const submit = (submittedOrder: string[], reconstructionText?: string) =>
      call<ActivityResult>(`/sessions/${sessionRef.current}/activity`, {
        method: 'PATCH',
        body: JSON.stringify({ submittedOrder, reconstructionText }),
      });

    const wrong = await submit(['card_2', 'card_1', 'card_3', 'card_4', 'card_5']);
    log(`오답 시도 → correct ${wrong?.orderCorrect}, keywords [${wrong?.retellingKeywords.join(',')}]`);
    const right = await submit(answer);
    log(`정답 시도 → correct ${right?.orderCorrect}, keywords [${right?.retellingKeywords.join(',')}]`);
    const done = await submit(answer, '며느리가 방귀를 참다가…');
    log(`재구성 저장 → completed ${done?.completed}`);
  };

  const report = async () => {
    if (!sessionRef.current) return;
    const data = await call<ReportData>(`/reports/${sessionRef.current}`);
    if (data) {
      const s = data.elementSummary;
      const pct = (c: { detected: unknown[]; total: number }) =>
        c.total === 0 ? 0 : Math.round((c.detected.length / c.total) * 100);
      log(
        `리포트: 달성률 ${Math.round(s.achievementRate * 100)}% | 논리 ${pct(s.logic)}% 공감 ${pct(s.empathy)}% 관점 ${pct(s.perspective)}% | 장면 ${data.scenes.length}개`,
      );
    }
  };

  return (
    <Screen scrollable className="gap-8 py-8">
      <h1 className="text-display font-bold">/dev — 목·프리미티브 확인 (T-13 전 삭제)</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-semibold">1. 프리미티브 갤러리</h2>
        <Stack direction="responsive" gap="lg" align="center">
          <Character name="며느리" state="idle" />
          <Character name="시아버지" state="speaking" />
          <Character name="이장" state="thinking" size="lg" />
        </Stack>
        <Stack gap="sm">
          <SpeechBubble speaker="narration">옛날 어느 마을에 방귀쟁이 며느리가 살았어요.</SpeechBubble>
          <SpeechBubble speaker="character">지우야, 나는 어떻게 하면 좋을까?</SpeechBubble>
          <SpeechBubble speaker="child">참으면 병이 나니까 말해 보면 돼요.</SpeechBubble>
          <SpeechBubble speaker="child" pending>
            …
          </SpeechBubble>
        </Stack>
        <Stack direction="row" gap="md" align="center">
          <TouchTarget>보내기 (48px)</TouchTarget>
          <TouchTarget size="lg" look="outline">
            다시 말하기 (56px)
          </TouchTarget>
          <TouchTarget size="record" aria-label="말하기">
            🎤
          </TouchTarget>
        </Stack>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-semibold">2. 목 콘솔</h2>
        <Stack direction="row" gap="sm" align="center" className="flex-wrap">
          <TouchTarget disabled={busy} onClick={() => run(login)}>
            로그인
          </TouchTarget>
          <TouchTarget disabled={busy} onClick={() => run(createSession)}>
            세션 생성
          </TouchTarget>
          <TouchTarget disabled={busy} onClick={() => run(() => oneTurn())}>
            한 턴 (제안 발화)
          </TouchTarget>
          <TouchTarget disabled={busy} look="outline" onClick={() => run(() => oneTurn('아무말'))}>
            한 턴 (아무말)
          </TouchTarget>
          <TouchTarget disabled={busy} look="outline" onClick={() => run(postActivity)}>
            사후 활동
          </TouchTarget>
          <TouchTarget disabled={busy} look="outline" onClick={() => run(report)}>
            리포트
          </TouchTarget>
          <label className="flex items-center gap-2 text-caption text-ink-soft">
            시나리오
            <select
              className="min-h-touch rounded-card border border-line bg-surface px-2"
              defaultValue="happy"
              onChange={(e) => {
                window.__gqMock?.setScenario(e.target.value as ScenarioName);
                log(`시나리오 → ${e.target.value}`);
              }}
            >
              {SCENARIOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <TouchTarget
            look="ghost"
            onClick={() => {
              window.__gqMock?.resetMockState();
              window.__gqMock?.resetScenario();
              sessionRef.current = null;
              sceneRef.current = null;
              setLogs([]);
              log('목 상태 초기화');
            }}
          >
            초기화
          </TouchTarget>
        </Stack>
        <pre className="min-h-64 overflow-x-auto rounded-card bg-surface-raised p-4 text-caption whitespace-pre-wrap">
          {logs.join('\n') || '로그인 → 세션 생성 → 한 턴 반복으로 CLOSING까지 진행해 보세요'}
        </pre>
      </section>
    </Screen>
  );
}
