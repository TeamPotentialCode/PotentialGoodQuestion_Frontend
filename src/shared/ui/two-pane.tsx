import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';

interface TwoPaneProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

/**
 * 대화 화면의 좌우 2단. 태블릿 가로에서 대략 55:45 로 나뉘고,
 * 폰 세로에서는 위아래로 쌓인다.
 * (브레이크포인트를 쓸 수 있는 유일한 레이어가 여기다 — app/features 에서는 금지)
 */
export function TwoPane({ left, right, className }: TwoPaneProps) {
  return (
    <div className={cn('flex flex-col gap-6 md:flex-row md:items-start md:gap-8', className)}>
      <div className="min-w-0 md:basis-[55%]">{left}</div>
      <div className="min-w-0 md:basis-[45%]">{right}</div>
    </div>
  );
}
