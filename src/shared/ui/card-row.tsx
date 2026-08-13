import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

interface CardRowProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * fill: 개수만큼 같은 너비로 한 줄을 꽉 채운다 (순서 맞추기 카드 5장)
   * grid: 최대 3열 격자 — 카드가 한 장이어도 한 장 크기를 유지한다 (이야기 목록)
   */
  variant?: 'fill' | 'grid';
}

/**
 * 카드 여러 장을 늘어놓는다.
 * 폰 세로에서는 2열로 접힌다.
 * (브레이크포인트를 쓸 수 있는 유일한 레이어가 여기다 — app/features 에서는 금지)
 */
export function CardRow({ variant = 'fill', className, ...rest }: CardRowProps) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 items-stretch gap-3',
        variant === 'fill'
          ? 'md:auto-cols-fr md:grid-flow-col md:grid-cols-none'
          : 'md:grid-cols-3',
        className,
      )}
      {...rest}
    />
  );
}
