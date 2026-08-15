import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';
import { Icon } from '@/shared/ui/icon';

interface SubHeaderProps {
  title: string;
  /** 뒤로 가는 곳. 히스토리로 돌아가야 하면 onBack 을 준다 */
  backHref?: string;
  onBack?: () => void;
  /** 시안에 화살표만 있는 화면(MY-02)은 빈 문자열을 준다 */
  backLabel?: string;
  /** 우측 끝 자리 (아이 칩 등). 없으면 제목 중앙 정렬용 자리만 잡는다 */
  right?: ReactNode;
  className?: string;
}

/**
 * 하위 화면 상단 바 (시안 CHILD-02·CONSENT·MY-02) — 좌 "뒤로", 중앙 제목.
 * 구분선이 화면 끝까지 가도록 Screen 의 패딩(px-4/8, py-6)을 음수 마진으로 상쇄한다.
 */
export function SubHeader({
  title,
  backHref,
  onBack,
  backLabel = '뒤로',
  right,
  className,
}: SubHeaderProps) {
  const back = (
    <>
      <Icon name="back" className="size-5" />
      {backLabel}
    </>
  );
  const backClass =
    'flex min-h-touch min-w-16 items-center gap-1 text-body font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft';

  return (
    <div className={cn('-mx-4 -mt-6 border-b border-line px-4 md:-mx-8 md:px-8', className)}>
      <div className="flex items-center justify-between gap-3 py-2">
        {backHref ? (
          <Link href={backHref} aria-label={backLabel || '뒤로'} className={backClass}>
            {back}
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} aria-label={backLabel || '뒤로'} className={backClass}>
            {back}
          </button>
        ) : (
          <span aria-hidden className="min-w-16" />
        )}
        <h1 className="flex-1 text-center text-bubble font-bold text-ink">{title}</h1>
        {right ?? <span aria-hidden className="min-w-16" />}
      </div>
    </div>
  );
}
