'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/ui/cn';

interface TouchTargetProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** record 는 88px 원형 — PRD 녹음 CTA 72px+ 요건. 호출부가 aria-label 을 반드시 준다 */
  size?: 'md' | 'lg' | 'record';
  look?: 'solid' | 'ghost' | 'outline';
}

const target = cva(
  [
    'inline-flex select-none items-center justify-center font-semibold',
    'touch-manipulation duration-(--motion-fast) active:scale-95',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      size: {
        md: 'min-h-touch min-w-touch rounded-card px-6 text-body',
        lg: 'min-h-touch-lg min-w-touch-lg rounded-card px-8 text-body',
        record: 'size-record rounded-full text-title',
      },
      look: {
        solid: 'bg-cta text-cta-ink',
        ghost: 'bg-transparent text-ink',
        outline: 'border-2 border-line bg-transparent text-ink',
      },
    },
    defaultVariants: { size: 'md', look: 'solid' },
  },
);

export function TouchTarget({ size, look, className, type, ...rest }: TouchTargetProps) {
  return <button type={type ?? 'button'} className={cn(target({ size, look }), className)} {...rest} />;
}
