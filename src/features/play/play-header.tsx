'use client';

import Link from 'next/link';
import { Bleed, Icon } from '@/shared/ui';

interface PlayHeaderProps {
  storyTitle: string;
  /** 대화 장면 중 몇 번째인지. 아직 장면을 못 불러왔으면 null */
  dialogueIndex: number | null;
  dialogueTotal: number | null;
  /** 내레이션 중에는 진행도 대신 "시작 (1/5)" 배지를 보여준다 */
  badge?: string | null;
}

// 좌: 닫기 / 가운데: 이야기 제목 / 우: 장면 진행도 (v6 — 회색 글자 한 줄)
export function PlayHeader({ storyTitle, dialogueIndex, dialogueTotal, badge }: PlayHeaderProps) {
  return (
    // 구분선은 화면 끝까지 — 대화 화면은 py-4 라 -mt-4 로 맞춘다 (v6)
    <Bleed className="-mt-4 border-b border-line">
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="min-w-24">
          <Link
            href="/home"
            aria-label="이야기 나가기"
            className="flex size-touch items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="close" className="size-7" />
          </Link>
        </span>

        <h1 className="text-bubble font-bold text-ink">{storyTitle}</h1>

        <span className="min-w-24 text-right text-body text-ink-soft">
          {badge ??
            (dialogueIndex !== null && dialogueTotal ? (
              <span
                role="progressbar"
                aria-valuenow={dialogueIndex}
                aria-valuemin={1}
                aria-valuemax={dialogueTotal}
                aria-label="이야기 진행"
              >
                장면 {dialogueIndex} / {dialogueTotal}
              </span>
            ) : null)}
        </span>
      </div>
    </Bleed>
  );
}
