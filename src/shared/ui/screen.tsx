import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

interface ScreenProps extends HTMLAttributes<HTMLElement> {
  scrollable?: boolean;
}

// 전체 화면 셸 — 모든 화면의 최상위. safe-area 패딩 포함
export function Screen({ scrollable = false, className, children, ...rest }: ScreenProps) {
  return (
    <main
      className={cn(
        'flex min-h-dvh w-full flex-col bg-surface text-body text-ink',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        'px-4 md:px-10',
        scrollable ? 'overflow-y-auto' : 'overflow-hidden',
        className,
      )}
      {...rest}
    >
      {children}
    </main>
  );
}
