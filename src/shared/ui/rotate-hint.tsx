'use client';

import { cn } from '@/shared/ui/cn';

interface RotateHintProps {
  message?: string;
  className?: string;
}

// 세로 모드에서만 표시되는 전체 화면 오버레이 — 플레이 화면에서만 렌더한다
export function RotateHint({ message = '화면을 가로로 돌려 주세요', className }: RotateHintProps) {
  return (
    <div
      role="status"
      className={cn(
        'fixed inset-0 z-50 flex-col items-center justify-center gap-6 bg-surface',
        'hidden portrait:flex',
        className,
      )}
    >
      <span aria-hidden className="block h-24 w-16 rotate-90 rounded-xl border-4 border-ink-soft transition-transform" />
      <p className="text-title text-ink">{message}</p>
    </div>
  );
}
