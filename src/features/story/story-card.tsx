import Link from 'next/link';
import type { StorySummary } from '@/core/api/types';
import { storyThumbnail } from '@/features/story/images';
import { ImageSlot, Stack } from '@/shared/ui';

/**
 * 이야기 목록(STORY-01)의 카드 한 장.
 * 홈의 "추천 이야기"는 시안이 달라 features/home/home-story-card.tsx 에 따로 있다.
 */
export function StoryCard({ story }: { story: StorySummary }) {
  return (
    <li className="flex">
      <Link
        href={`/stories/${story.storyId}`}
        className="flex w-full flex-col gap-3 rounded-card border-2 border-ink bg-white p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
      >
        {/* thumbnailUrl 은 시드에 실재하지 않는 더미 주소라 대개 자리표시로 떨어진다 */}
        <ImageSlot
          src={storyThumbnail(story.storyId) ?? story.thumbnailUrl}
          label="이미지 준비물"
          size="bare"
          className="aspect-square w-full rounded-control"
        />

        <Stack gap="sm">
          <p className="text-title font-extrabold text-ink">{story.title}</p>
          <p className="flex items-center text-body text-ink-soft">
            시간: {story.estimatedMinutes}분
            <span aria-hidden className="mx-3 h-3.5 w-px bg-line-strong" />
            난이도: {story.difficulty}
          </p>

          {story.topics.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {story.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-[6px] bg-surface-raised px-2.5 py-1 text-caption text-ink"
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}

          <span className="pt-1 text-body font-bold text-ink">이야기 보기 →</span>
        </Stack>
      </Link>
    </li>
  );
}

/**
 * 아직 없는 이야기의 자리. 시안이 목록을 3장으로 채워 두라고 명시한다 —
 * 이야기가 하나뿐인 지금도 "곧 더 온다"는 것이 보이게 하려는 의도다.
 * 누를 수 없고 읽어줄 내용도 없어 보조기기에서는 통째로 감춘다.
 */
export function StoryPlaceholderCard() {
  return (
    <li aria-hidden className="flex">
      <div className="relative flex w-full flex-col gap-3 rounded-card border border-line bg-white p-4">
        {/* "준비 중" 뱃지는 시안대로 썸네일 위에 겹쳐 얹는다 */}
        <span className="absolute top-7 left-7 z-10 rounded-[4px] bg-ink-soft px-2.5 py-1 text-[12px] font-bold text-cta-ink">
          준비 중
        </span>
        <ImageSlot label="" size="bare" className="aspect-square w-full rounded-control opacity-60" />
        <Stack gap="sm">
          <p className="text-title font-extrabold text-ink-faint">새로운 이야기</p>
          <p className="text-body text-ink-faint">시간: 15분</p>
          <ul className="flex flex-wrap gap-2">
            {['태그', '태그'].map((label, i) => (
              <li
                key={i}
                className="rounded-[6px] bg-surface-raised px-2.5 py-1 text-caption text-ink-faint"
              >
                {label}
              </li>
            ))}
          </ul>
        </Stack>
      </div>
    </li>
  );
}
