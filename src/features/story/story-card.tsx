import Link from 'next/link';
import type { StorySummary } from '@/core/api/types';
import { ImageSlot, Stack } from '@/shared/ui';

/**
 * 이야기 목록의 카드 한 장.
 * 홈의 "추천 이야기"(features/home/story-list.tsx)와 시안이 달라 따로 둔다.
 */
export function StoryCard({ story }: { story: StorySummary }) {
  return (
    <li className="flex">
      <Link
        href={`/stories/${story.storyId}`}
        className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
      >
        {/* thumbnailUrl 은 시드에 실재하지 않는 더미 주소라 대개 자리표시로 떨어진다 */}
        <ImageSlot src={story.thumbnailUrl} label="이미지 준비물" />

        <Stack gap="sm">
          <p className="text-title font-semibold text-ink">{story.title}</p>
          <p className="text-caption text-ink-soft">
            시간: {story.estimatedMinutes}분 <span aria-hidden>|</span> 난이도: {story.difficulty}
          </p>

          {story.topics.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {story.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full bg-surface-raised px-3 py-1 text-caption text-ink"
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}

          <span className="text-caption font-semibold text-ink">이야기 보기 →</span>
        </Stack>
      </Link>
    </li>
  );
}
