import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

interface BleedProps extends HTMLAttributes<HTMLDivElement> {
  /** Screen/페이지의 py-6 상단 패딩까지 상쇄해 화면 맨 위에 붙인다 */
  top?: boolean;
}

/**
 * Screen 의 좌우 패딩(px-4 md:px-8)을 음수 마진으로 상쇄해 화면 끝까지 닿는 줄.
 * v6 의 상단 바·하단 바처럼 구분선이 화면 폭 전체에 걸치는 곳에 쓴다.
 * (브레이크포인트는 shared/ui 안에서만 — 이 래퍼가 그 규칙을 지켜준다)
 */
export function Bleed({ top = false, className, ...rest }: BleedProps) {
  return (
    <div className={cn('-mx-4 px-4 md:-mx-8 md:px-8', top && '-mt-6', className)} {...rest} />
  );
}
