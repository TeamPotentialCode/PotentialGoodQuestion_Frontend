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
import { ActivityHeader } from '@/features/activity/activity-header';
import { activityErrorMessage } from '@/features/activity/error-message';
import { saveHandoff } from '@/features/activity/handoff';
import { OrderCard } from '@/features/activity/order-card';
import { useRequireAuth } from '@/features/auth/use-session';
import { CardRow, Screen, Stack, TouchTarget } from '@/shared/ui';

export default function PostOrderPage() {
  const authenticated = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  // 아이가 아직 안 옮겼으면 서버가 섞어준 순서가 그대로 화면 순서다.
  // 이펙트로 state 를 채우면 렌더가 한 번 더 도므로 파생값으로 둔다
  const [moved, setMoved] = useState<string[] | null>(null);
  // 시안: 확인 결과를 화면에 보여주고 아이가 스스로 다음으로 넘어간다
  const [result, setResult] = useState<'none' | 'wrong' | 'correct'>('none');

  const activity = useQuery({
    queryKey: ['activity', sessionId],
    queryFn: () => startActivity(sessionId),
    enabled: authenticated && Number.isFinite(sessionId),
    staleTime: Infinity,
  });

  const order = moved ?? activity.data?.cards.map((card) => card.id) ?? [];

  const submit = useMutation({
    mutationFn: () => submitActivity(sessionId, { submittedOrder: order }),
    onSuccess: (submitted) => {
      if (!submitted.orderCorrect) {
        setResult('wrong');
        return;
      }
      // 핵심 단어는 이 응답으로만 온다 — 다시 말하기 화면이 새로고침돼도 남게 저장한다
      saveHandoff(sessionId, {
        submittedOrder: order,
        retellingKeywords: submitted.retellingKeywords,
      });
      // 시안: 바로 넘기지 않고 "잘했어!" 를 보여준 뒤 아이가 "다음으로"를 누른다
      setResult('correct');
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
    setResult('none');
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
            {activityErrorMessage(activity.error)}
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
        <ActivityHeader title="이야기 돌아보기" step="1 / 2" />

        <Stack gap="sm" align="center">
          <h2 className="text-title font-semibold text-ink">이야기를 순서대로 놓아 볼까?</h2>
          <p className="text-caption text-ink-soft">처음부터 마지막까지 차례대로 놓아 주세요.</p>
        </Stack>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <CardRow>
              {order.map((id, index) => {
                const card = cards.find((c) => c.id === id);
                return card ? (
                  <OrderCard key={id} card={card} slot={index + 1} solved={result === 'correct'} />
                ) : null;
              })}
            </CardRow>
          </SortableContext>
        </DndContext>

        <Stack gap="sm" align="center">
          {/* 시안: 결과 문구가 버튼 위에 오고, 오답이면 힌트가 한 줄 더 붙는다 */}
          {result === 'correct' && (
            <p className="text-body font-semibold text-ink">잘했어! 순서를 모두 맞췄어.</p>
          )}
          {result === 'wrong' && (
            <>
              <p role="alert" className="text-body text-ink">
                조금만 다시 생각해 볼까?
              </p>
              <p className="flex items-center gap-2 rounded-card bg-surface-raised px-4 py-2 text-caption text-ink-soft">
                <span aria-hidden>💡</span>
                <span>
                  <span className="font-semibold text-ink">힌트</span> 가장 처음 있었던 일을 먼저
                  찾아볼까?
                </span>
              </p>
            </>
          )}

          {result === 'correct' ? (
            <TouchTarget
              size="lg"
              onClick={() => router.replace(`/sessions/${sessionId}/post/retelling`)}
            >
              다음으로
            </TouchTarget>
          ) : (
            <TouchTarget
              size="lg"
              onClick={() => submit.mutate()}
              disabled={submit.isPending || order.length === 0}
            >
              {result === 'wrong' ? '다시 확인하기' : '순서 확인하기'}
            </TouchTarget>
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
