'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { startActivity, submitActivity } from '@/features/activity/api';
import { saveHandoff } from '@/features/activity/handoff';
import { OrderCard } from '@/features/activity/order-card';
import { useRequireAuth } from '@/features/auth/use-session';
import { CardRow, Icon, Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PostOrderPage() {
  const authenticated = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  // 아이가 아직 안 옮겼으면 서버가 섞어준 순서가 그대로 화면 순서다.
  // 이펙트로 state 를 채우면 렌더가 한 번 더 도므로 파생값으로 둔다
  const [moved, setMoved] = useState<string[] | null>(null);
  const [wrong, setWrong] = useState(false);

  const activity = useQuery({
    queryKey: ['activity', sessionId],
    queryFn: () => startActivity(sessionId),
    enabled: authenticated && Number.isFinite(sessionId),
    staleTime: Infinity,
  });

  const order = moved ?? activity.data?.cards.map((card) => card.id) ?? [];

  const submit = useMutation({
    mutationFn: () => submitActivity(sessionId, { submittedOrder: order }),
    onSuccess: (result) => {
      if (!result.orderCorrect) {
        setWrong(true);
        return;
      }
      // 핵심 단어는 이 응답으로만 온다 — 다시 말하기 화면이 새로고침돼도 남게 저장한다
      saveHandoff(sessionId, {
        submittedOrder: order,
        retellingKeywords: result.retellingKeywords,
      });
      router.replace(`/sessions/${sessionId}/post/retelling`);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // 키보드로도 옮길 수 있어야 한다(접근성 + E2E 는 이 경로로 구동한다)
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWrong(false);
    setMoved(arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))));
  }

  if (!authenticated || activity.isPending) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  if (activity.isError || !activity.data) {
    return (
      <Screen scrollable className="py-10">
        <Stack gap="lg" className="mx-auto w-full max-w-lg">
          <p role="alert" className="text-body text-ink">
            활동을 불러오지 못했어요.
          </p>
          <Link href="/home">
            <TouchTarget look="outline">홈으로</TouchTarget>
          </Link>
        </Stack>
      </Screen>
    );
  }

  const cards = activity.data.cards;

  return (
    <Screen scrollable className="py-4" data-testid="post-order">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack
          direction="row"
          align="center"
          justify="between"
          gap="md"
          className="border-b border-line pb-3"
        >
          <Link
            href="/home"
            aria-label="활동 나가기"
            className="flex size-touch items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="close" className="size-7" />
          </Link>
          <h1 className="text-body font-semibold text-ink">이야기 돌아보기</h1>
          <span className="min-w-40 text-right">
            <span className="rounded-full bg-surface-raised px-4 py-1.5 text-caption text-ink">
              1 / 2
            </span>
          </span>
        </Stack>

        <Stack gap="sm" align="center">
          <h2 className="text-title font-semibold text-ink">이야기를 순서대로 놓아 볼까?</h2>
          <p className="text-caption text-ink-soft">처음부터 마지막까지 차례대로 놓아 주세요.</p>
        </Stack>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <CardRow>
              {order.map((id, index) => {
                const card = cards.find((c) => c.id === id);
                return card ? <OrderCard key={id} card={card} slot={index + 1} /> : null;
              })}
            </CardRow>
          </SortableContext>
        </DndContext>

        <Stack gap="sm" align="center">
          <TouchTarget
            size="lg"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || order.length === 0}
          >
            순서 확인하기
          </TouchTarget>

          {/* 시안의 피드백 자리 — 오답이어도 화면에 머물고 다시 해볼 수 있다 */}
          {wrong && (
            <p role="alert" className="text-body text-ink">
              아직 순서가 달라요. 다시 놓아 볼까?
            </p>
          )}
          {submit.isError && (
            <p role="alert" className="text-body text-ink">
              잠깐 문제가 생겼어요. 다시 눌러 볼까요?
            </p>
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
