'use client';

import type { NarrationPage } from '@/features/play/scene-source';
import { SceneColumn } from '@/features/play/scene-column';
import { cn, Stack, TouchTarget, TwoPane } from '@/shared/ui';

interface PlayNarrationProps {
  page: NarrationPage;
  /** 이야기 전체 내레이션 수 — 점 인디케이터 개수 */
  total: number;
  /** 단어 담기용 — 이 세션에 물린 아이 */
  childId: number | null;
  onReplay: () => void;
  onNext: () => void;
}

// v6 scene-story: 좌측 삽화 + 낭독 패널, 우측은 안내 문구가 가운데, 바닥에 점 인디케이터 + "다음"
export function PlayNarration({ page, total, childId, onReplay, onNext }: PlayNarrationProps) {
  return (
    <TwoPane
      rightFill
      left={
        <SceneColumn
          imageUrl={page.imageUrl}
          imageLabel={`장면 ${page.narrationIndex} 삽화`}
          text={page.text}
          onReplay={onReplay}
          replayLabel="내레이션 다시 듣기"
          childId={childId}
        />
      }
      right={
        <div className="flex h-full w-full flex-col">
          <Stack gap="sm" align="center" className="my-auto py-16">
            <p className="text-title font-bold text-ink" aria-live="polite">
              이야기를 듣고 있어요
            </p>
            <p className="text-bubble text-ink-soft">이야기가 끝난 뒤에 질문에 대답해 보아요.</p>
          </Stack>

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
        </div>
      }
    />
  );
}
