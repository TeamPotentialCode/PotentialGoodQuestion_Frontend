import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 로그인·회원가입의 카드 셸. 화면 가운데에 폭이 제한된 카드 하나만 놓는다(시안 AUTH-01).
 * 로고 자리는 아직 실제 로고가 없어 표시만 해 둔다.
 */
export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    // 바깥 가운데 정렬은 (auth)/layout 이 한다 — 여기서 또 하면 높이가 두 배로 잡힌다
    <div className={cn('w-full rounded-card bg-surface p-8 shadow-sm', className)}>
      <div className="flex flex-col items-center gap-2 pb-6">
        <span
          aria-hidden
          className="rounded-card border border-dashed border-line bg-surface-raised px-4 py-2 text-caption font-semibold text-ink-soft"
        >
          [GOOD QUESTION 로고]
        </span>
        <h1 className="pt-2 text-title font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-caption text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
