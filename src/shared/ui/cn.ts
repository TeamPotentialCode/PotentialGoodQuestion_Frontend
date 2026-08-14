import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * tailwind-merge 는 `text-*` 가 글자 크기인지 색인지 이름만으로는 못 가른다.
 * 우리 토큰(text-body, text-ink-soft …)을 알려주지 않으면 둘을 같은 그룹으로 보고
 * 뒤에 온 클래스가 앞의 것을 지운다 — 크기를 줬는데 색만 남는 식으로.
 * 토큰을 추가하면 여기에도 등록한다. 이름은 tokens.css 의 @theme inline 과 맞춘다.
 */
const FONT_SIZES = ['caption', 'body', 'bubble', 'title', 'display'];
const TEXT_COLORS = ['ink', 'ink-soft', 'cta-ink', 'danger'];
const SPACINGS = ['touch', 'touch-lg', 'record'];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'text-color': [{ text: TEXT_COLORS }],
      w: [{ w: SPACINGS }],
      h: [{ h: SPACINGS }],
      size: [{ size: SPACINGS }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
