import { describe, expect, it } from 'vitest';
import { splitLines, splitSentences, splitTokens } from '@/core/wordbook/tokenize';

describe('splitSentences', () => {
  it('마침표로 문장을 나눈다', () => {
    expect(
      splitSentences('옛날 어느 마을에 며느리가 살았어요. 며느리는 방귀를 참았어요.'),
    ).toEqual(['옛날 어느 마을에 며느리가 살았어요.', '며느리는 방귀를 참았어요.']);
  });

  it('물음표·느낌표도 문장 끝으로 본다', () => {
    expect(splitSentences('정말 그럴까? 나는 아니라고 생각해!')).toEqual([
      '정말 그럴까?',
      '나는 아니라고 생각해!',
    ]);
  });

  it('마침표가 없어도 줄바꿈이면 나눈다 — 원문 내레이션이 이렇게 온다', () => {
    expect(splitSentences('첫째 줄\n둘째 줄')).toEqual(['첫째 줄', '둘째 줄']);
  });

  it('빈 줄과 앞뒤 공백은 버린다', () => {
    expect(splitSentences('  \n\n 한 문장이에요. \n\n ')).toEqual(['한 문장이에요.']);
  });
});

describe('splitTokens', () => {
  it('공백으로 나누고 원문과 저장용을 함께 준다', () => {
    expect(splitTokens('며느리는 방귀를 참았어요.')).toEqual([
      { raw: '며느리는', clean: '며느리는' },
      { raw: '방귀를', clean: '방귀를' },
      { raw: '참았어요.', clean: '참았어요' },
    ]);
  });

  it('따옴표는 저장용에서만 뗀다 — 화면 글은 원문 그대로여야 한다', () => {
    expect(splitTokens('“민준아, 괜찮아?”')).toEqual([
      { raw: '“민준아,', clean: '민준아' },
      { raw: '괜찮아?”', clean: '괜찮아' },
    ]);
  });

  it('조사는 떼지 않는다 (형태소 분석 없이 떼면 멀쩡한 낱말이 깎인다)', () => {
    expect(splitTokens('바다가 넓어요.').map((t) => t.clean)).toEqual(['바다가', '넓어요']);
  });

  it('알맹이가 없는 조각은 버린다', () => {
    expect(splitTokens('— … 안녕')).toEqual([
      { raw: '—', clean: '—' },
      { raw: '안녕', clean: '안녕' },
    ]);
  });
});

describe('splitLines', () => {
  it('줄을 유지한 채 각 줄을 문장으로 나눈다', () => {
    expect(splitLines('첫 줄이에요. 둘째 문장.\n다음 줄이에요.')).toEqual([
      ['첫 줄이에요.', '둘째 문장.'],
      ['다음 줄이에요.'],
    ]);
  });

  it('빈 줄은 결과에서 빠진다', () => {
    expect(splitLines('한 줄\n\n\n두 줄')).toEqual([['한 줄'], ['두 줄']]);
  });
});
