import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';

interface TwoPaneProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  /**
   * 오른쪽 칸을 세로로 꽉 채운다 (v6 대화 화면 — 상호작용 패널이 바닥에 붙는다).
   * 오른쪽 내용의 마지막 덩어리에 mt-auto 를 주면 바닥으로 내려간다
   */
  rightFill?: boolean;
}

/**
 * 대화 화면의 좌우 2단. 태블릿 가로에서 대략 55:45 로 나뉘고,
 * 폰 세로에서는 위아래로 쌓인다.
 * (브레이크포인트를 쓸 수 있는 유일한 레이어가 여기다 — app/features 에서는 금지)
 */
export function TwoPane({ left, right, className, rightFill = false }: TwoPaneProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:flex-row md:items-start md:gap-8',
        rightFill && 'md:items-stretch',
        className,
      )}
    >
      <div className="min-w-0 md:basis-[55%]">{left}</div>
      <div className={cn('min-w-0 md:basis-[45%]', rightFill && 'flex flex-col md:min-h-[600px]')}>
        {right}
      </div>
    </div>
  );
}
