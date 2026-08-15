// 목 실패 시나리오 스위치.
// 브라우저: localStorage['gq:msw:scenario']를 매 요청마다 읽는다 — DevTools에서 즉시 전환 가능.
// 노드(테스트): 모듈 변수 사용. '-once' 변형은 한 번 소비되면 happy로 자동 복귀한다.
export type ScenarioName =
  | 'happy'
  | 'stt-empty' // STT 200 + 빈 텍스트
  | 'stt-fail-once' // STT 500 1회 후 자동 복귀 ("한 번만 더" 문구 확인용)
  | 'stt-fail-always' // STT 500 지속 (3연속 "조용한 곳" 문구 확인용)
  | 'analysis-fail-once' // utterances 500 1회 (TAP_RETRY + Idempotency-Key 재사용 확인용)
  | 'expired-token' // 보호 라우트 401, refresh 성공 시 해제
  | 'slow-network' // utterances 8초 지연 (대기 모션 확인용)
  | 'word-save-slow'; // 단어 저장 20초 지연 (실서버 GPT 지연 재현용 — E2E 에서는 쓰지 않는다)

const STORAGE_KEY = 'gq:msw:scenario';

let nodeScenario: ScenarioName = 'happy';

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getScenario(): ScenarioName {
  if (hasLocalStorage()) {
    return (localStorage.getItem(STORAGE_KEY) as ScenarioName | null) ?? 'happy';
  }
  return nodeScenario;
}

export function setScenario(scenario: ScenarioName): void {
  if (hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, scenario);
    return;
  }
  nodeScenario = scenario;
}

export function resetScenario(): void {
  setScenario('happy');
}

// 해당 시나리오가 활성이면 true를 반환하고, '-once' 변형은 소비 후 리셋한다
export function consumeScenario(scenario: ScenarioName): boolean {
  if (getScenario() !== scenario) return false;
  if (scenario.endsWith('-once')) resetScenario();
  return true;
}
