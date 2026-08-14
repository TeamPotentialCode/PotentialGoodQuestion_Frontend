'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { isConsentMissing } from '@/features/child-profile/error-message';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getHome } from '@/features/home/api';
import { getStoryDetail, startSession } from '@/features/story/api';
import { storyThumbnail } from '@/features/story/images';
import { useIntroAudio } from '@/features/story/use-intro-audio';
import { Icon, ImageSlot, Screen, Stack, TouchTarget, TwoPane } from '@/shared/ui';

export default function StoryDetailPage() {
  const router = useRouter();
  const authenticated = useRequireAuth();
  const params = useParams<{ storyId: string }>();
  const storyId = Number(params.storyId);

  const queryClient = useQueryClient();
  const child = useSelectedChild(authenticated);
  const story = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => getStoryDetail(storyId),
    enabled: authenticated && Number.isFinite(storyId),
  });

  // 진행 중인 세션은 홈 응답에만 있다. 같은 쿼리를 공유해 중복 요청을 피한다
  const home = useQuery({
    queryKey: ['home', child.selected?.childId],
    queryFn: () => getHome(child.selected!.childId),
    enabled: authenticated && child.selected !== undefined,
  });
  const inProgress =
    home.data?.continueSession?.storyId === storyId ? home.data.continueSession : null;

  const start = useMutation({
    mutationFn: () => startSession(storyId, child.selected!.childId),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      router.push(`/play/${session.sessionId}`);
    },
  });

  const intro = useIntroAudio(story.data?.introduction ?? '');

  if (!authenticated || story.isPending) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  if (story.isError || !story.data) {
    return (
      <Screen scrollable className="py-10">
        <Stack gap="lg" className="mx-auto w-full max-w-lg">
          <p role="alert" className="text-body text-ink">
            이야기를 불러오지 못했어요.
          </p>
          <Link href="/home">
            <TouchTarget look="outline">홈으로</TouchTarget>
          </Link>
        </Stack>
      </Screen>
    );
  }

  const detail = story.data;
  const noChild = child.list.length === 0;

  return (
    <Screen scrollable className="py-4" data-testid="story-detail">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack direction="row" align="center" gap="md" className="border-b border-line pb-3">
          <Link
            href="/stories"
            className="flex min-h-touch items-center gap-1 text-body text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="back" className="size-5" />
            뒤로
          </Link>
          <h1 className="flex-1 text-center text-body font-semibold text-ink">이야기 소개</h1>
          <span aria-hidden className="min-w-16" />
        </Stack>

        <TwoPane
          left={
            <Stack gap="md">
              <ImageSlot src={storyThumbnail(storyId) ?? detail.thumbnailUrl} label="이야기 대표 이미지" />

              <Stack direction="row" gap="sm" justify="center">
                <SideAction
                  icon="speaker"
                  label={intro.state === 'playing' ? '멈추기' : '이야기 듣기'}
                  onClick={intro.toggle}
                  disabled={intro.state === 'loading' || !detail.introduction}
                />
                <SideAction
                  icon="chat"
                  label="캐릭터와 말하기"
                  onClick={() => (inProgress ? router.push(`/play/${inProgress.sessionId}`) : start.mutate())}
                  disabled={noChild || start.isPending || home.isPending}
                />
                {/*
                 * 세션 재시작 API 가 없다. 진행 중이면 새로 만들어도 그 세션이 그대로 돌아와
                 * "처음부터" 가 되지 않으므로 그때는 비활성으로 둔다
                 */}
                <SideAction
                  icon="refresh"
                  label="다시 만들어 보기"
                  onClick={() => start.mutate()}
                  disabled={noChild || inProgress !== null || start.isPending}
                  title={inProgress ? '지금은 이어서 할 수 있어요' : undefined}
                />
              </Stack>
            </Stack>
          }
          right={
            <Stack gap="md">
              <h2 className="text-display font-bold text-ink">{detail.title}</h2>
              <p className="text-body text-ink-soft">{detail.summary}</p>

              <Stack direction="row" gap="sm" className="flex-wrap">
                <Badge icon="clock">{detail.estimatedMinutes}분</Badge>
                <Badge icon="book">{detail.difficulty}</Badge>
              </Stack>

              {detail.topics.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {detail.topics.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full bg-surface-raised px-3 py-1 text-caption text-ink"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-line pt-4">
                <h3 className="text-title font-bold text-ink">어떤 이야기일까?</h3>
                <p className="pt-2 text-body text-ink">{detail.introduction}</p>
                {detail.situation && (
                  <p className="pt-1 text-body text-ink-soft">{detail.situation}</p>
                )}
              </div>

              {detail.childRole && (
                <div className="rounded-card bg-surface-raised px-5 py-4">
                  <h3 className="text-title font-bold text-ink">이 이야기에서 너는?</h3>
                  <p className="pt-2 text-body font-semibold text-ink">{detail.childRole}</p>
                  <p className="text-caption text-ink-soft">
                    캐릭터가 네 이야기를 듣고 다시 질문을 해 줄 거예요.
                  </p>
                </div>
              )}
            </Stack>
          }
        />

        <Stack gap="sm" align="center" className="pt-2">
          {/*
           * 동의 없는 아이는 백엔드가 세션 시작을 404 로 막는다(2026-08-14 반영).
           * 동의 화면이 생기기 전에 등록된 아이가 여기에 걸리므로 막다른 안내 대신 동의로 보낸다
           */}
          {start.isError &&
            (isConsentMissing(start.error) && child.selected ? (
              <Stack gap="sm" align="center">
                <p role="alert" className="text-body text-ink">
                  이야기를 시작하려면 보호자 동의가 필요해요.
                </p>
                <Link
                  href={`/children/${child.selected.childId}/consent?next=/stories/${storyId}`}
                >
                  <TouchTarget size="lg">동의하러 가기</TouchTarget>
                </Link>
              </Stack>
            ) : (
              <p role="alert" className="text-body text-ink">
                이야기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            ))}

          {noChild ? (
            <Stack gap="sm" align="center">
              <p className="text-body text-ink-soft">
                이야기를 시작하려면 아이를 먼저 등록해 주세요.
              </p>
              <Link href="/children">
                <TouchTarget>아이 등록하기</TouchTarget>
              </Link>
            </Stack>
          ) : inProgress ? (
            <Link href={`/play/${inProgress.sessionId}`} className="w-full max-w-md">
              <TouchTarget size="lg" className="w-full">
                이어서 하기 →
              </TouchTarget>
            </Link>
          ) : (
            <TouchTarget
              size="lg"
              className="w-full max-w-md"
              disabled={start.isPending || child.selected === undefined || home.isPending}
              onClick={() => start.mutate()}
            >
              {start.isPending ? '시작하는 중…' : '이야기 시작하기 →'}
            </TouchTarget>
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}

/** 대표 이미지 아래 보조 동작 3개 */
function SideAction({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: 'speaker' | 'chat' | 'refresh';
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex min-h-touch flex-1 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface px-2 py-3 text-caption font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft disabled:opacity-40"
    >
      <Icon name={icon} className="size-5" />
      {label}
    </button>
  );
}

function Badge({ icon, children }: { icon: 'clock' | 'book'; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-card border border-line px-3 py-1 text-caption text-ink">
      <Icon name={icon} className="size-4" />
      {children}
    </span>
  );
}
