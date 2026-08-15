/*
 * 낭독 본문을 "줄 → 문장 → 단어" 로 쪼갠다. 아이가 모르는 단어를 눌러 담을 때 쓴다.
 *
 * 한국어 조사(며느리"는", 창피"해서")는 **떼지 않는다**. 형태소 분석 없이 규칙으로 떼면
 * 명사만 고쳐지고 활용형은 못 고치면서 "바다·구름" 같은 멀쩡한 낱말을 깎아먹는다.
 * 대신 저장할 때 그 단어가 들어 있던 문장을 함께 보내 백엔드 GPT 가 문맥으로 풀게 한다.
 */

/** 문장 끝으로 볼 문장부호 */
const SENTENCE_END = /(?<=[.!?…])\s+/;
/** 단어 앞뒤에 붙는 장식 — 저장할 때만 떼고 화면에는 원문 그대로 그린다 */
const EDGE_PUNCTUATION = /^[\s"'“”‘’(){}[\]«»]+|[\s"'“”‘’(){}[\]«»,.!?…:;~]+$/g;

export interface WordToken {
  /** 화면에 그리는 원문 조각 — 문장부호까지 그대로여야 글이 자연스럽다 */
  raw: string;
  /** 저장·중복 판정에 쓰는 알맹이 */
  clean: string;
}

/**
 * 문단을 문장 목록으로 나눈다. 줄바꿈이 먼저다 —
 * 원문 내레이션은 줄바꿈으로 호흡을 나누고, 마침표 없이 줄만 바뀌는 문장도 있다.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(SENTENCE_END))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/** 문장을 공백 기준으로 단어 조각으로 나눈다. 알맹이가 없는 조각(문장부호만)은 버린다. */
export function splitTokens(sentence: string): WordToken[] {
  return sentence
    .split(/\s+/)
    .map((raw) => ({ raw, clean: raw.replace(EDGE_PUNCTUATION, '') }))
    .filter((token) => token.clean.length > 0);
}

/** 본문을 줄 단위로 보존한 채 문장으로 나눈다 — 화면이 줄바꿈을 살려 그릴 수 있게 */
export function splitLines(text: string): string[][] {
  return text
    .split(/\n/)
    .map((line) => splitSentences(line))
    .filter((sentences) => sentences.length > 0);
}
