import Link from 'next/link';
import type { StorySummary } from '@/core/api/types';
import { storyThumbnail } from '@/features/story/images';
import { ImageSlot, Stack } from '@/shared/ui';

/**
 * 홈(HOME-01)의 "오늘의 추천 이야기" 카드.
 * 목록 화면(STORY-01)의 카드와 시안이 달라 따로 둔다 —
 * 여기는 뱃지(시작 가능/준비 중)와 소요 시간이 한 줄로 붙고, 주제는 점으로 이어 쓴다.
 */
export function HomeStoryCard({ story }: { story: StorySummary }) {
  return (
    <li className="flex">
      <Link
        href={`/stories/${story.storyId}`}
        className="flex w-full flex-col gap-3 rounded-card border border-line bg-white p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
      >
        <ImageSlot
          src={storyThumbnail(story.storyId) ?? story.thumbnailUrl}
          label="이야기 썸네일"
          size="bare"
          className="h-[104px] rounded-control"
        />
        <Stack gap="sm">
          <Stack direction="row" align="center" justify="between" gap="sm">
            <span className="rounded-[4px] bg-tab-active px-2.5 py-1 text-[12px] font-bold text-cta-ink">
              시작 가능
            </span>
            <span className="text-body text-ink-soft">{story.estimatedMinutes}분</span>
          </Stack>
          <p className="text-title font-extrabold text-ink">{story.title}</p>
          {story.topics.length > 0 && (
            <p className="text-caption text-ink-soft">{story.topics.join(' · ')}</p>
          )}
        </Stack>
      </Link>
    </li>
  );
}

/** 아직 없는 이야기의 자리 — 시안이 추천을 3장으로 채워 둔다 */
export function HomeStoryPlaceholderCard() {
  return (
    <li aria-hidden className="flex">
      <div className="flex w-full flex-col gap-3 rounded-card border border-line bg-white p-4">
        <ImageSlot label="이야기 썸네일" size="bare" className="h-[104px] rounded-control opacity-60" />
        <Stack gap="sm">
          <Stack direction="row" align="center" justify="between" gap="sm">
            <span className="rounded-[4px] bg-surface-raised px-2.5 py-1 text-[12px] font-bold text-ink-faint">
              준비 중
            </span>
            <span className="text-body text-ink-faint">15분</span>
          </Stack>
          <p className="text-title font-extrabold text-ink-faint">[이야기 제목]</p>
          <p className="text-caption text-ink-faint">키워드 준비 중</p>
        </Stack>
      </div>
    </li>
  );
}
