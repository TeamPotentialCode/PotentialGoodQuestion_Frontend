'use client';

import Link from 'next/link';
import { Icon, Stack } from '@/shared/ui';

interface ActivityHeaderProps {
  title: string;
  /** "1 / 2" 처럼 활동 단계 */
  step: string;
}

// 좌: 닫기 / 가운데: 제목 / 우: 단계 배지 — 순서 맞추기와 다시 말하기가 공유한다
export function ActivityHeader({ title, step }: ActivityHeaderProps) {
  return (
    <Stack
      direction="row"
      align="center"
      justify="between"
      gap="md"
      className="border-b border-line pb-3"
    >
      <Link
        href="/home"
        aria-label="활동 나가기"
        className="flex size-touch items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
      >
        <Icon name="close" className="size-7" />
      </Link>
      <h1 className="text-body font-semibold text-ink">{title}</h1>
      <span className="min-w-40 text-right">
        <span className="rounded-full bg-surface-raised px-4 py-1.5 text-caption text-ink">
          {step}
        </span>
      </span>
    </Stack>
  );
}
