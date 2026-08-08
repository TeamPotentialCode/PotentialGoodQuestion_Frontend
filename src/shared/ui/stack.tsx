import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/ui/cn';

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** responsive: 폰 세로 → 태블릿 가로 (브레이크포인트의 유일한 합법적 위치가 이 레이어다) */
  direction?: 'column' | 'row' | 'responsive';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'stretch';
  justify?: 'start' | 'center' | 'between';
}

const stack = cva('flex', {
  variants: {
    direction: {
      column: 'flex-col',
      row: 'flex-row',
      responsive: 'flex-col md:flex-row',
    },
    gap: { sm: 'gap-2', md: 'gap-4', lg: 'gap-8' },
    align: { start: 'items-start', center: 'items-center', stretch: 'items-stretch' },
    justify: { start: 'justify-start', center: 'justify-center', between: 'justify-between' },
  },
  defaultVariants: { direction: 'column', gap: 'md', align: 'stretch', justify: 'start' },
});

export function Stack({ direction, gap, align, justify, className, ...rest }: StackProps) {
  return <div className={cn(stack({ direction, gap, align, justify }), className)} {...rest} />;
}
