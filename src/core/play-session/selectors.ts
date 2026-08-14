import type { Phase, PlayEvent } from './types';

// Phase 변형이 추가되면 각 셀렉터가 컴파일 에러를 낸다
function assertNever(x: never): never {
  throw new Error(`unreachable phase: ${JSON.stringify(x)}`);
}

// 하드웨어 점유가 단일값이라 마이크·스피커 동시 점유가 구조적으로 불가능하다 —
// iOS에서 캐릭터 음성 볼륨이 죽는 원인을 타입으로 차단한다
export function hardwareOwner(phase: Phase): 'none' | 'mic' | 'speaker' {
  switch (phase.tag) {
    case 'recording':
      return 'mic';
    case 'narrating':
    case 'speaking':
      return 'speaker';
    case 'locked':
    case 'loading':
    case 'awaitingChild':
    case 'transcribing':
    case 'reviewing':
    case 'analyzing':
    case 'mission':
    case 'error':
    case 'sceneComplete':
    case 'fatal':
      return 'none';
    default:
      return assertNever(phase);
  }
}

export function sessionMode(phase: Phase): 'playback' | 'play-and-record' {
  // TAP_SEND 시 recorder를 먼저 내리므로(계획서 §8) transcribing 이후는 playback이다
  return phase.tag === 'recording' ? 'play-and-record' : 'playback';
}

// 상태별 활성 버튼 — 어떤 phase에서도 2개를 넘지 않는다
export function availableActions(phase: Phase): PlayEvent['type'][] {
  switch (phase.tag) {
    case 'locked':
      return ['TAP_UNLOCK'];
    case 'awaitingChild':
      // 시안 v3: 캐릭터 말이 끝나면 마이크가 저절로 켜진다 — 아이가 누를 것이 없다.
      // TAP_SPEAK 전이 자체는 남아 있고, 화면이 잠깐 뒤 스스로 보낸다
      return [];
    case 'recording':
      return ['TAP_SEND'];
    case 'reviewing':
      return ['TAP_RERECORD', 'TAP_SEND'];
    case 'error':
      return ['TAP_RETRY'];
    case 'sceneComplete':
      // 이야기가 끝났으면 다음 장면이 없다 — 화면은 말하기 후 활동으로 넘어간다
      return phase.postActivity ? [] : ['TAP_NEXT_SCENE'];
    case 'narrating':
      return ['TAP_NEXT'];
    case 'mission':
      return ['MISSION_DISMISSED'];
    case 'loading':
    case 'speaking':
    case 'transcribing':
    case 'analyzing':
    case 'fatal':
      return [];
    default:
      return assertNever(phase);
  }
}
