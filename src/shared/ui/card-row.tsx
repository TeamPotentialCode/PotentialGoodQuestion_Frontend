import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

/**
 * 카드 여러 장을 한 줄로 늘어놓는다.
 * 태블릿 가로에서는 개수만큼 같은 너비로 한 줄, 폰 세로에서는 2열로 접힌다.
 * (브레이크포인트를 쓸 수 있는 유일한 레이어가 여기다 — app/features 에서는 금지)
 */
export function CardRow({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 items-stretch gap-3',
        'md:auto-cols-fr md:grid-flow-col md:grid-cols-none',
        className,
      )}
      {...rest}
    />
  );
}
