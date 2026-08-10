'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useRequireAuth } from '@/features/auth/use-session';
import { getChildren } from '@/features/child-profile/api';
import { ChildForm } from '@/features/child-profile/child-form';
import { Stack, TouchTarget } from '@/shared/ui';

export default function ChildrenPage() {
  const authenticated = useRequireAuth();
  // 등록 가능 인원은 백엔드만 알고 있다(ChildService.MAX_CHILDREN).
  // 프론트는 그 값을 복제하지 않고, 서버가 정원 초과를 알려주면 그때 폼을 접는다
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const children = useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
    enabled: authenticated,
  });

  if (!authenticated || children.isPending) {
    return <p className="text-body text-ink-soft">불러오는 중…</p>;
  }

  if (children.isError) {
    return (
      <p role="alert" className="text-body text-ink">
        아이 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  const registered = children.data ?? [];
  const isEditing = editingId !== null;

  return (
    <Stack gap="lg">
      <h1 className="text-display font-bold text-ink">아이 관리</h1>

      {registered.length > 0 && (
        <section aria-label="등록된 아이" className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {registered.map((child) =>
              editingId === child.childId ? (
                <li key={child.childId} className="rounded-card bg-surface-raised p-4">
                  <Stack gap="md">
                    <ChildForm child={child} onDone={() => setEditingId(null)} />
                    <TouchTarget look="ghost" onClick={() => setEditingId(null)}>
                      취소
                    </TouchTarget>
                  </Stack>
                </li>
              ) : (
                <li
                  key={child.childId}
                  className="flex items-center justify-between gap-4 rounded-card bg-surface-raised p-4"
                >
                  <div>
                    <p className="text-title font-semibold text-ink">{child.name}</p>
                    <p className="text-body text-ink-soft">
                      만 {child.age}세 · {child.birthYear}년생
                    </p>
                  </div>
                  <TouchTarget
                    look="outline"
                    aria-label={`${child.name} 수정`}
                    onClick={() => setEditingId(child.childId)}
                  >
                    수정
                  </TouchTarget>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {/* 편집 중에는 폼이 두 개 뜨지 않도록 신규 등록 폼을 감춘다 */}
      {!isEditing &&
        (limitMessage ? (
          <p className="text-body text-ink-soft">{limitMessage}</p>
        ) : (
          <Stack gap="md">
            <p className="text-body text-ink-soft">
              {registered.length === 0
                ? '이야기를 함께할 아이의 정보를 알려 주세요.'
                : '아이를 더 등록할 수 있어요.'}
            </p>
            <ChildForm onLimitReached={setLimitMessage} />
          </Stack>
        ))}

      {registered.length > 0 && (
        <Link href="/home">
          <TouchTarget size="lg" look="outline" className="w-full">
            홈으로
          </TouchTarget>
        </Link>
      )}
    </Stack>
  );
}
