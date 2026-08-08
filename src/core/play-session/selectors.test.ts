import { describe, expect, it } from 'vitest';
import { availableActions, hardwareOwner, sessionMode } from './selectors';
import type { Phase, PhaseTag } from './types';

// Record<PhaseTag, ...>라서 Phase 변형이 추가되면 이 픽스처가 컴파일 에러를 낸다
const PHASES: Record<PhaseTag, Phase> = {
  locked: { tag: 'locked' },
  loading: { tag: 'loading' },
  narrating: { tag: 'narrating', sentenceIndex: 0 },
  speaking: { tag: 'speaking', kind: 'opening' },
  awaitingChild: { tag: 'awaitingChild' },
  recording: { tag: 'recording' },
  transcribing: { tag: 'transcribing' },
  reviewing: { tag: 'reviewing' },
  analyzing: { tag: 'analyzing' },
  error: { tag: 'error', message: '오류', attempt: 1 },
  sceneComplete: { tag: 'sceneComplete', nextSceneId: null, postActivity: true },
  fatal: { tag: 'fatal', message: '오류' },
};

const ALL_PHASES = Object.values(PHASES);

describe('hardwareOwner', () => {
  it('1. 모든 phase에서 none | mic | speaker 중 단일값을 반환한다', () => {
    for (const phase of ALL_PHASES) {
      expect(['none', 'mic', 'speaker']).toContain(hardwareOwner(phase));
    }
  });

  it('2. recording은 mic, narrating·speaking은 speaker다', () => {
    expect(hardwareOwner(PHASES.recording)).toBe('mic');
    expect(hardwareOwner(PHASES.narrating)).toBe('speaker');
    expect(hardwareOwner({ tag: 'speaking', kind: 'opening' })).toBe('speaker');
    expect(hardwareOwner({ tag: 'speaking', kind: 'reply' })).toBe('speaker');
    expect(hardwareOwner({ tag: 'speaking', kind: 'closing' })).toBe('speaker');
  });
});

describe('sessionMode', () => {
  it('recording만 play-and-record다', () => {
    for (const phase of ALL_PHASES) {
      expect(sessionMode(phase)).toBe(phase.tag === 'recording' ? 'play-and-record' : 'playback');
    }
  });
});

describe('availableActions', () => {
  it('어떤 phase에서도 활성 버튼이 2개를 넘지 않는다', () => {
    for (const phase of ALL_PHASES) {
      expect(availableActions(phase).length).toBeLessThanOrEqual(2);
    }
  });

  it('reviewing은 다시 말하기와 보내기 두 개다', () => {
    expect(availableActions(PHASES.reviewing)).toEqual(['TAP_RERECORD', 'TAP_SEND']);
  });
});
