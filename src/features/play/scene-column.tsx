'use client';

import { Icon, ImageSlot, Stack, TouchTarget } from '@/shared/ui';

interface SceneColumnProps {
  imageUrl: string | null;
  imageLabel: string;
  /** 내레이터가 읽어주는 장면 설명. 없으면 패널을 그리지 않는다 */
  text: string;
  onReplay: () => void;
  replayLabel: string;
}

// 대화·내레이션 화면의 좌측 열 — 장면 이미지 + 낭독 패널 (v6 TALK-01)
export function SceneColumn({ imageUrl, imageLabel, text, onReplay, replayLabel }: SceneColumnProps) {
  return (
    <Stack gap="md">
      <ImageSlot src={imageUrl} label={imageLabel} className="bg-surface-raised" />

      {text && (
        <div className="rounded-card bg-surface px-5 py-4">
          <p className="flex items-center gap-2 text-caption font-bold text-accent">
            <Icon name="wave" className="size-4" />
            이야기 듣는 중
          </p>
          {/* 원문 설명은 여러 줄로 온다 — 줄바꿈을 살린다 */}
          <p className="pt-2 text-body whitespace-pre-line text-ink">{text}</p>
          <TouchTarget
            size="sm"
            look="ghost"
            aria-label={replayLabel}
            onClick={onReplay}
            className="mt-1 text-ink-soft"
          >
            <Icon name="refresh" className="size-4" />
            다시 듣기
          </TouchTarget>
        </div>
      )}
    </Stack>
  );
}
