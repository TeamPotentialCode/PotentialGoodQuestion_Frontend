'use client';

import Link from 'next/link';
import { Bleed, Icon } from '@/shared/ui';

interface ActivityHeaderProps {
  title: string;
  /** "1 / 2" 처럼 활동 단계 */
  step: string;
  /** 좌측 X 옆에 붙는 이야기 제목 (시안 POST-01·02) */
  storyTitle?: string;
}

// 좌: 닫기+이야기 제목 / 가운데: 단계 이름 / 우: 단계 배지 — 순서 맞추기와 다시 말하기가 공유한다
export function ActivityHeader({ title, step, storyTitle }: ActivityHeaderProps) {
  return (
    // 구분선은 화면 끝까지 — 활동 화면은 py-4 라 -mt-4 로 맞춘다 (v6)
    <Bleed className="-mt-4 border-b border-line">
      <div className="flex items-center justify-between gap-3 py-2">
        <span className="flex min-w-40 items-center gap-3">
          <Link
            href="/home"
            aria-label="활동 나가기"
            className="flex size-touch items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="close" className="size-7" />
          </Link>
          {storyTitle && <span className="text-bubble font-bold text-ink">{storyTitle}</span>}
        </span>
        <h1 className="text-body font-medium text-ink-soft">{title}</h1>
        <span className="min-w-40 text-right">
          <span className="rounded-[6px] border border-line bg-white px-3 py-1.5 text-caption font-bold text-ink">
            {step}
          </span>
        </span>
      </div>
    </Bleed>
  );
}
