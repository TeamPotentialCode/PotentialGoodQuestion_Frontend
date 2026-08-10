'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { ChildPicker } from '@/features/child-profile/child-picker';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getHome } from '@/features/home/api';
import { getStoryDetail, startSession } from '@/features/story/api';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

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

  // 백엔드는 세션을 재사용하지 않고 매번 새로 만든다. 진행 중인 세션이 있으면
  // "시작하기" 대신 "이어하기"를 보여줘 중복 세션이 쌓이지 않게 한다.
  // 세션 정보는 이야기 상세가 아니라 홈 응답에만 있어서 같은 쿼리를 공유한다
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
      // 홈의 이어하기가 즉시 반영되도록 캐시를 무효화한다
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      router.push(`/play/${session.sessionId}`);
    },
  });

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

  return (
    <Screen scrollable className="py-10">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        <h1 className="text-display font-bold text-ink">{detail.title}</h1>
        <p className="text-body text-ink-soft">
          {detail.difficulty} · 약 {detail.estimatedMinutes}분
          {detail.topics.length > 0 && ` · ${detail.topics.join(' · ')}`}
        </p>

        <section aria-label="이야기 소개" className="flex flex-col gap-3 rounded-card bg-surface-raised p-4">
          <p className="text-body text-ink">{detail.introduction}</p>
          {detail.situation && <p className="text-body text-ink-soft">{detail.situation}</p>}
          {detail.childRole && (
            <div>
              <h2 className="text-title font-semibold text-ink">아이의 역할</h2>
              <p className="text-body text-ink-soft">{detail.childRole}</p>
            </div>
          )}
        </section>

        {child.list.length === 0 ? (
          <Stack gap="sm" align="start">
            <p className="text-body text-ink-soft">이야기를 시작하려면 아이를 먼저 등록해 주세요.</p>
            <Link href="/children">
              <TouchTarget>아이 등록하기</TouchTarget>
            </Link>
          </Stack>
        ) : (
          <Stack gap="md">
            <ChildPicker list={child.list} selected={child.selected} onSelect={child.select} />
            {start.isError && (
              <p role="alert" className="text-body text-ink">
                이야기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
            {inProgress ? (
              <Stack gap="sm">
                <p className="text-body text-ink-soft">
                  {inProgress.currentSceneOrder !== null
                    ? `${inProgress.currentSceneOrder}번째 장면까지 진행했어요.`
                    : '이미 시작한 이야기예요.'}
                </p>
                <Link href={`/play/${inProgress.sessionId}`}>
                  <TouchTarget size="lg" className="w-full">
                    이어하기
                  </TouchTarget>
                </Link>
              </Stack>
            ) : (
              <TouchTarget
                size="lg"
                disabled={start.isPending || child.selected === undefined || home.isPending}
                onClick={() => start.mutate()}
              >
                {start.isPending ? '시작하는 중…' : '시작하기'}
              </TouchTarget>
            )}
          </Stack>
        )}

        <Link href="/home">
          <TouchTarget look="outline" className="w-full">
            홈으로
          </TouchTarget>
        </Link>
      </Stack>
    </Screen>
  );
}
