'use client';

import type { NarrationPage } from '@/features/play/scene-source';
import { cn, Icon, ImageSlot, Stack, TouchTarget } from '@/shared/ui';

interface PlayNarrationProps {
  page: NarrationPage;
  /** 이야기 전체 내레이션 수 — 점 인디케이터 개수 */
  total: number;
  onReplay: () => void;
  onNext: () => void;
}

// 큰 삽화 + 내레이션 한 문장 + 점 인디케이터 + "다음"
export function PlayNarration({ page, total, onReplay, onNext }: PlayNarrationProps) {
  return (
    <Stack gap="md">
      <ImageSlot src={page.imageUrl} label={`장면 ${page.narrationIndex} 삽화`} />

      <div className="rounded-card bg-surface-raised px-5 py-4">
        <p className="flex items-start gap-3 text-body font-semibold text-ink">
          <Icon name="wave" className="mt-1" />
          <span>{page.text}</span>
        </p>
        <TouchTarget
          size="sm"
          look="ghost"
          aria-label="내레이션 다시 듣기"
          onClick={onReplay}
          className="mt-1 text-ink-soft"
        >
          <Icon name="speaker" className="size-4" />
          다시 듣기
        </TouchTarget>
      </div>

      <Stack direction="row" align="center" justify="between" gap="md">
        <span className="flex gap-2" role="presentation">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-2.5 rounded-full',
                i + 1 === page.narrationIndex ? 'bg-ink' : 'bg-line',
              )}
            />
          ))}
        </span>

        <TouchTarget size="lg" onClick={onNext}>
          다음 →
        </TouchTarget>
      </Stack>
    </Stack>
  );
}
