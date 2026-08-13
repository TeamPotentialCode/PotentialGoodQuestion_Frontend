import Link from 'next/link';
import type { ContinueSession } from '@/core/api/types';
import { ImageSlot, Stack, TouchTarget } from '@/shared/ui';

interface ContinueCardProps {
  session: ContinueSession;
  /** 이야기 예상 소요 시간(분). 추천 목록에서 찾아 넘긴다 */
  estimatedMinutes?: number;
  /** 대화 장면 기준 진행도. 아직 못 구했으면 null */
  progress: { current: number; total: number } | null;
}

/**
 * "이어서 이야기하기" 카드 (시안 HOME-01).
 *
 * 장면 진행도와 예상 시간은 `ContinueSession` 에 없어서 밖에서 채워 넣는다 —
 * 백엔드에 두 필드를 요청해 둔 상태다. 못 구했으면 그 줄만 비운다.
 */
export function ContinueCard({ session, estimatedMinutes, progress }: ContinueCardProps) {
  const ratio = progress && progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Stack
      direction="row"
      align="center"
      gap="md"
      className="rounded-card border border-line bg-surface p-4"
    >
      <ImageSlot src={session.thumbnailUrl} label="이야기 썸네일" size="thumb" />

      <Stack gap="sm" className="min-w-0 flex-1">
        <p className="text-title font-bold text-ink">{session.storyTitle}</p>
        <p className="text-caption font-semibold text-ink-soft">
          {progress && `장면 ${progress.current} / ${progress.total}`}
          {progress && estimatedMinutes !== undefined && <span aria-hidden> | </span>}
          {estimatedMinutes !== undefined && `예상 활동 시간: ${estimatedMinutes}분`}
        </p>
        <span
          role="progressbar"
          aria-valuenow={progress?.current ?? 0}
          aria-valuemin={0}
          aria-valuemax={progress?.total ?? 0}
          aria-label="이야기 진행"
          className="block h-2 w-full overflow-hidden rounded-full bg-line"
        >
          <span className="block h-full rounded-full bg-ink" style={{ width: `${ratio}%` }} />
        </span>
      </Stack>

      <Link href={`/play/${session.sessionId}`} className="shrink-0">
        <TouchTarget size="lg">이어서 하기</TouchTarget>
      </Link>
    </Stack>
  );
}
