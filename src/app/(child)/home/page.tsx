'use client';

// 로그인 이후 착지 화면 — 지금은 인증이 유지되는지 확인하는 최소 구성이다.
// 이어하기·추천 이야기(백엔드 /api/home)는 다음 단계에서 붙인다.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { apiRequest } from '@/core/api/client';
import type { Child } from '@/core/api/types';
import { useRequireAuth } from '@/features/auth/use-session';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function HomePage() {
  const router = useRouter();
  const authenticated = useRequireAuth();

  const children = useQuery({
    queryKey: ['children'],
    queryFn: () => apiRequest<Child[]>('/children'),
    enabled: authenticated,
  });

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  return (
    <Screen scrollable className="py-10">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        <h1 className="text-display font-bold text-ink">홈</h1>
        <p className="text-body text-ink-soft">로그인된 상태입니다. 다음 단계는 아이 프로필 등록이에요.</p>

        <section className="rounded-card bg-surface-raised p-4">
          <h2 className="text-title font-semibold text-ink">등록된 아이</h2>
          {children.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
          {children.isError && (
            <p role="alert" className="text-body text-ink">
              아이 목록을 불러오지 못했어요.
            </p>
          )}
          {children.data &&
            (children.data.length === 0 ? (
              <p className="text-body text-ink-soft">아직 등록된 아이가 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {children.data.map((child) => (
                  <li key={child.childId} className="text-body text-ink">
                    {child.name} · 만 {child.age}세 ({child.birthYear}년생)
                  </li>
                ))}
              </ul>
            ))}
        </section>

        <TouchTarget
          look="outline"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
        >
          로그아웃
        </TouchTarget>
      </Stack>
    </Screen>
  );
}
