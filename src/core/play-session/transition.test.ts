import { describe, expect, it } from 'vitest';
import { transition } from './transition';
import {
  INITIAL_STATE,
  MIC_NO_DEVICE_COPY,
  MIC_PERMISSION_COPY,
  STT_SILENT_COPY,
  type PlayEvent,
  type PlayState,
  type ScenePlan,
  type UtteranceOutcome,
} from './types';

function scene(sentenceCount: number): ScenePlan {
  return {
    sceneId: 3,
    narrationSentences: Array.from({ length: sentenceCount }, (_, i) => `문장 ${i + 1}`),
    maxTurns: 4,
  };
}

function outcome(partial: Partial<UtteranceOutcome> = {}): UtteranceOutcome {
  return {
    characterText: '그래, 며느리도 많이 힘들었겠구나.',
    isClosing: false,
    sceneCompleted: false,
    nextSceneId: null,
    ...partial,
  };
}

function run(events: PlayEvent[], from: PlayState = INITIAL_STATE): PlayState {
  return events.reduce(transition, from);
}

const TRANSCRIPT = { text: '며느리가 참았어요', sttRawText: '며느리가 참아써요' };

// locked → … → awaitingChild (내레이션 없는 장면으로 최단 도달)
function atAwaitingChild(): PlayState {
  return run([
    { type: 'TAP_UNLOCK' },
    { type: 'SCENE_LOADED', scene: scene(0) },
    { type: 'SPEECH_ENDED' },
  ]);
}

function atReviewing(): PlayState {
  return run(
    [
      { type: 'TAP_SPEAK' },
      { type: 'TAP_SEND' },
      { type: 'STT_SUCCEEDED', transcript: TRANSCRIPT },
    ],
    atAwaitingChild(),
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

describe('transition', () => {
  it('3. narrating 중 TAP_SEND는 무시된다', () => {
    const narrating = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(2) }]);
    expect(narrating.phase).toEqual({ tag: 'narrating', sentenceIndex: 0 });
    expect(transition(narrating, { type: 'TAP_SEND' })).toBe(narrating);
  });

  it('4. 내레이션 문장 2개 완주 후 speaking(opening)에 도달한다', () => {
    const narrating = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(2) }]);
    const afterFirst = transition(narrating, { type: 'NARRATION_SENTENCE_ENDED' });
    expect(afterFirst.phase).toEqual({ tag: 'narrating', sentenceIndex: 1 });
    const afterSecond = transition(afterFirst, { type: 'NARRATION_SENTENCE_ENDED' });
    expect(afterSecond.phase).toEqual({ tag: 'speaking', kind: 'opening' });
  });

  it('4-1. TAP_NEXT도 내레이션을 한 문장 넘긴다 (아이가 "다음"을 누르는 경로)', () => {
    const narrating = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(2) }]);
    const afterFirst = transition(narrating, { type: 'TAP_NEXT' });
    expect(afterFirst.phase).toEqual({ tag: 'narrating', sentenceIndex: 1 });
    expect(transition(afterFirst, { type: 'TAP_NEXT' }).phase).toEqual({
      tag: 'speaking',
      kind: 'opening',
    });
  });

  it('4-2. narrating이 아닐 때 TAP_NEXT는 무시된다', () => {
    const opening = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(0) }]);
    expect(transition(opening, { type: 'TAP_NEXT' })).toBe(opening);
  });

  it('4-3. 마이크를 못 켜면 recording 에서 이유별 문구와 함께 error 로 간다', () => {
    const recording = run([
      { type: 'TAP_UNLOCK' },
      { type: 'SCENE_LOADED', scene: scene(0) },
      { type: 'SPEECH_ENDED' },
      { type: 'TAP_SPEAK' },
    ]);
    expect(recording.phase).toEqual({ tag: 'recording' });

    const denied = transition(recording, { type: 'MIC_FAILED', reason: 'permission' });
    expect(denied.phase).toMatchObject({ tag: 'error', message: MIC_PERMISSION_COPY });
    // 마이크 문제는 아이 잘못이 아니다 — 연속 실패로 세지 않는다
    expect(denied.consecutiveFailures).toBe(0);
    // "다시 시도"가 녹음으로 돌아가야 한다
    expect(transition(denied, { type: 'TAP_RETRY' }).phase).toEqual({ tag: 'recording' });

    expect(
      transition(recording, { type: 'MIC_FAILED', reason: 'no-device' }).phase,
    ).toMatchObject({ message: MIC_NO_DEVICE_COPY });
  });

  it('4-4. recording 이 아닐 때 MIC_FAILED 는 무시된다', () => {
    const opening = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(0) }]);
    expect(transition(opening, { type: 'MIC_FAILED', reason: 'permission' })).toBe(opening);
  });

  it('4-5. 소리가 안 들어온 실패는 3회 누적 안내로 번지지 않는다', () => {
    let state = run([
      { type: 'TAP_UNLOCK' },
      { type: 'SCENE_LOADED', scene: scene(0) },
      { type: 'SPEECH_ENDED' },
    ]);
    for (let i = 0; i < 3; i += 1) {
      state = transition(state, { type: 'TAP_SPEAK' });
      state = transition(state, { type: 'TAP_SEND' });
      state = transition(state, { type: 'STT_FAILED', reason: 'silent' });
      expect(state.phase).toMatchObject({ tag: 'error', message: STT_SILENT_COPY });
      expect(state.consecutiveFailures).toBe(0);
      state = transition(state, { type: 'TAP_RETRY' });
    }
  });

  it('5. opening 재생 종료 시 awaitingChild가 된다', () => {
    const opening = run([{ type: 'TAP_UNLOCK' }, { type: 'SCENE_LOADED', scene: scene(0) }]);
    expect(opening.phase).toEqual({ tag: 'speaking', kind: 'opening' });
    expect(transition(opening, { type: 'SPEECH_ENDED' }).phase).toEqual({ tag: 'awaitingChild' });
  });

  it('6. 한 턴을 완주한다', () => {
    let state = atAwaitingChild();
    const steps: [PlayEvent, string][] = [
      [{ type: 'TAP_SPEAK' }, 'recording'],
      [{ type: 'TAP_SEND' }, 'transcribing'],
      [{ type: 'STT_SUCCEEDED', transcript: TRANSCRIPT }, 'reviewing'],
      [{ type: 'TAP_SEND' }, 'analyzing'],
      [{ type: 'ANALYSIS_SUCCEEDED', outcome: outcome() }, 'speaking'],
      [{ type: 'SPEECH_ENDED' }, 'awaitingChild'],
    ];
    for (const [event, tag] of steps) {
      state = transition(state, event);
      expect(state.phase.tag).toBe(tag);
    }
  });

  it('7. reviewing에서 TAP_RERECORD 시 recording으로 가고 transcript가 초기화된다', () => {
    const reviewing = atReviewing();
    expect(reviewing.transcript).toEqual(TRANSCRIPT);
    const rerecord = transition(reviewing, { type: 'TAP_RERECORD' });
    expect(rerecord.phase).toEqual({ tag: 'recording' });
    expect(rerecord.transcript).toBeNull();
  });

  it('8. analyzing 중 TAP_SEND는 무시된다', () => {
    const analyzing = transition(atReviewing(), { type: 'TAP_SEND' });
    expect(analyzing.phase).toEqual({ tag: 'analyzing' });
    expect(transition(analyzing, { type: 'TAP_SEND' })).toBe(analyzing);
  });

  it('9. sceneCompleted에 nextSceneId가 있으면 closing 재생 후 sceneComplete가 된다', () => {
    const analyzing = transition(atReviewing(), { type: 'TAP_SEND' });
    const closing = transition(analyzing, {
      type: 'ANALYSIS_SUCCEEDED',
      outcome: outcome({ sceneCompleted: true, isClosing: true, nextSceneId: 5 }),
    });
    expect(closing.phase).toEqual({ tag: 'speaking', kind: 'closing' });
    const complete = transition(closing, { type: 'SPEECH_ENDED' });
    expect(complete.phase).toEqual({ tag: 'sceneComplete', nextSceneId: 5, postActivity: false });
  });

  it('10. nextSceneId가 null이면 postActivity가 true다', () => {
    const analyzing = transition(atReviewing(), { type: 'TAP_SEND' });
    const complete = run(
      [
        {
          type: 'ANALYSIS_SUCCEEDED',
          outcome: outcome({ sceneCompleted: true, isClosing: true, nextSceneId: null }),
        },
        { type: 'SPEECH_ENDED' },
      ],
      analyzing,
    );
    expect(complete.phase).toEqual({ tag: 'sceneComplete', nextSceneId: null, postActivity: true });
  });

  it('11. STT 첫 실패 메시지에 "한 번만 더"가 포함된다', () => {
    const failed = run([{ type: 'TAP_SPEAK' }, { type: 'TAP_SEND' }, { type: 'STT_FAILED' }], atAwaitingChild());
    expect(failed.phase.tag).toBe('error');
    if (failed.phase.tag === 'error') {
      expect(failed.phase.message).toContain('한 번만 더');
      expect(failed.phase.attempt).toBe(1);
    }
  });

  it('12. STT 3회 연속 실패 메시지에 "조용한 곳"이 포함된다', () => {
    let s = run([{ type: 'TAP_SPEAK' }], atAwaitingChild());
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_FAILED' }, { type: 'TAP_RETRY' }], s);
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_FAILED' }, { type: 'TAP_RETRY' }], s);
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_FAILED' }], s);
    expect(s.phase.tag).toBe('error');
    if (s.phase.tag === 'error') {
      expect(s.phase.message).toContain('조용한 곳');
      expect(s.phase.attempt).toBe(3);
    }
  });

  it('13. STT 성공 시 consecutiveFailures가 0으로 리셋된다', () => {
    let s = run([{ type: 'TAP_SPEAK' }], atAwaitingChild());
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_FAILED' }, { type: 'TAP_RETRY' }], s);
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_FAILED' }, { type: 'TAP_RETRY' }], s);
    expect(s.consecutiveFailures).toBe(2);
    s = run([{ type: 'TAP_SEND' }, { type: 'STT_SUCCEEDED', transcript: TRANSCRIPT }], s);
    expect(s.phase).toEqual({ tag: 'reviewing' });
    expect(s.consecutiveFailures).toBe(0);
  });

  it('14. transition은 입력 state를 변경하지 않는다', () => {
    const transcribing = run([{ type: 'TAP_SPEAK' }, { type: 'TAP_SEND' }], atAwaitingChild());
    const snapshot = structuredClone(transcribing);
    deepFreeze(transcribing); // strict mode에서 변경 시 throw
    const next = transition(transcribing, { type: 'STT_SUCCEEDED', transcript: TRANSCRIPT });
    expect(next).not.toBe(transcribing);
    expect(transcribing).toEqual(snapshot);
  });
});
