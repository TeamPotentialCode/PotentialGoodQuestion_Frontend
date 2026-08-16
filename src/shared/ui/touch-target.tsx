'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/ui/cn';

interface TouchTargetProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * record 는 88px 원형 — PRD 녹음 CTA 72px+ 요건. 호출부가 aria-label 을 반드시 준다.
   * sm 은 "다시 듣기" 처럼 본문에 딸린 보조 동작 — 글자만 작고 터치 영역은 48px 을 지킨다
   */
  size?: 'sm' | 'md' | 'lg' | 'record';
  look?: 'solid' | 'ghost' | 'outline';
}

const target = cva(
  [
    'inline-flex select-none items-center justify-center font-semibold',
    'touch-manipulation duration-(--motion-fast) active:scale-95',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
    'disabled:pointer-events-none',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-touch gap-2 rounded-control text-caption font-normal',
        md: 'min-h-touch min-w-touch rounded-cta px-6 text-body',
        lg: 'min-h-touch-lg min-w-touch-lg rounded-cta px-7 text-bubble font-bold',
        record: 'size-record rounded-full text-title',
      },
      look: {
        // 비활성은 시안대로 연회색 판 + 회색 글자 (어두운 판을 흐리게 하지 않는다)
        solid: 'bg-cta text-ink disabled:bg-line disabled:text-ink-faint',
        ghost: 'bg-transparent text-ink disabled:opacity-40',
        outline: 'border border-line-strong bg-white text-ink disabled:opacity-40',
      },
    },
    defaultVariants: { size: 'md', look: 'solid' },
  },
);

export function TouchTarget({ size, look, className, type, ...rest }: TouchTargetProps) {
  return <button type={type ?? 'button'} className={cn(target({ size, look }), className)} {...rest} />;
}
