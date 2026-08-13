'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { getChildren } from '@/features/child-profile/api';
import { ChildFormScreen } from '@/features/child-profile/child-form-screen';
import { Screen } from '@/shared/ui';

export default function EditChildPage() {
  const authenticated = useRequireAuth();
  const params = useParams<{ childId: string }>();
  const childId = Number(params.childId);

  // 단건 조회 API 가 없어 목록에서 찾는다. 목록은 이미 캐시돼 있을 때가 많다
  const children = useQuery({ queryKey: ['children'], queryFn: getChildren, enabled: authenticated });
  const child = children.data?.find((c) => c.childId === childId);

  if (!authenticated || children.isPending) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }
  if (!child) {
    return (
      <Screen scrollable className="py-10">
        <p role="alert" className="text-body text-ink">
          아이를 찾지 못했어요.
        </p>
      </Screen>
    );
  }
  return <ChildFormScreen child={child} />;
}
