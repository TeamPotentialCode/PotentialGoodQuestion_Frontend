'use client';

import Link from 'next/link';
import { Icon, Stack } from '@/shared/ui';

interface PlayHeaderProps {
  storyTitle: string;
  /** 대화 장면 중 몇 번째인지. 아직 장면을 못 불러왔으면 null */
  dialogueIndex: number | null;
  dialogueTotal: number | null;
}

// 좌: 닫기 / 가운데: 이야기 제목 / 우: 장면 진행도 + 진행 바
export function PlayHeader({ storyTitle, dialogueIndex, dialogueTotal }: PlayHeaderProps) {
  const ratio =
    dialogueIndex !== null && dialogueTotal ? Math.round((dialogueIndex / dialogueTotal) * 100) : 0;

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
        aria-label="이야기 나가기"
        className="flex size-touch items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
      >
        <Icon name="close" className="size-7" />
      </Link>

      <h1 className="text-body font-semibold text-ink">{storyTitle}</h1>

      {dialogueIndex !== null && dialogueTotal ? (
        <Stack direction="row" align="center" gap="sm" className="min-w-40">
          <span className="text-caption text-ink-soft whitespace-nowrap">
            장면 {dialogueIndex} / {dialogueTotal}
          </span>
          <span
            role="progressbar"
            aria-valuenow={dialogueIndex}
            aria-valuemin={1}
            aria-valuemax={dialogueTotal}
            aria-label="이야기 진행"
            className="h-1.5 w-24 overflow-hidden rounded-full bg-line"
          >
            <span className="block h-full rounded-full bg-ink" style={{ width: `${ratio}%` }} />
          </span>
        </Stack>
      ) : (
        <span className="min-w-40" />
      )}
    </Stack>
  );
}
