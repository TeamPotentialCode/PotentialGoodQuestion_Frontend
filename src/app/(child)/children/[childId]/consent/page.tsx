'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/use-session';
import { getChildren } from '@/features/child-profile/api';
import { ConsentScreen } from '@/features/child-profile/consent-screen';
import { Screen } from '@/shared/ui';

export default function ChildConsentPage() {
  const authenticated = useRequireAuth();
  const params = useParams<{ childId: string }>();
  const childId = Number(params.childId);

  // 단건 조회 API 가 없어 목록에서 찾는다 (수정 화면과 같은 방식)
  const children = useQuery({ queryKey: ['children'], queryFn: getChildren, enabled: authenticated });
  const child = children.data?.find((c) => c.childId === childId);

  /*
   * 방금 등록한 아이라 캐시에는 아직 없다 — 무효화한 목록이 도착하기 전에
   * "아이를 찾지 못했어요" 가 한 번 번쩍이던 문제를 isFetching 으로 막는다
   */
  if (!authenticated || children.isPending || (!child && children.isFetching)) {
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
  return <ConsentScreen child={child} />;
}
