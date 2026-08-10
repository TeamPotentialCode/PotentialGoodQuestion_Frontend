import type { StorySummary } from '@/core/api/types';

interface StoryListProps {
  stories: StorySummary[];
}

// thumbnailUrl 은 실재하지 않는 더미 주소라 이미지는 그리지 않는다.
// 카드 클릭(이야기 상세)은 다음 작업에서 연결한다
export function StoryList({ stories }: StoryListProps) {
  if (stories.length === 0) {
    return <p className="text-body text-ink-soft">아직 준비된 이야기가 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {stories.map((story) => (
        <li key={story.storyId} className="rounded-card bg-surface-raised p-4">
          <p className="text-title font-semibold text-ink">{story.title}</p>
          <p className="text-body text-ink-soft">
            {story.difficulty} · 약 {story.estimatedMinutes}분
          </p>
          {story.topics.length > 0 && (
            <p className="text-caption text-ink-soft">{story.topics.join(' · ')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
