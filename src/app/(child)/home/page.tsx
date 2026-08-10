'use client';

// 로그인 이후 착지 화면 — 지금은 인증이 유지되는지 확인하는 최소 구성이다.
// 이어하기·추천 이야기(백엔드 /api/home)는 다음 단계에서 붙인다.
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/core/api/auth-token';
import { useRequireAuth } from '@/features/auth/use-session';
import { getChildren } from '@/features/child-profile/api';
import { Screen, Stack, TouchTarget } from '@/shared/ui';

export default function HomePage() {
  const router = useRouter();
  const authenticated = useRequireAuth();

  const children = useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
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
        <p className="text-body text-ink-soft">
          {children.data && children.data.length > 0
            ? '이어하기와 추천 이야기는 구현 예정'
            : '아이를 등록하면 이야기를 시작할 수 있어요.'}
        </p>

        <section className="rounded-card bg-surface-raised p-4">
          <h2 className="text-title font-semibold text-ink">등록된 아이</h2>
          {children.isPending && <p className="text-body text-ink-soft">불러오는 중…</p>}
          {children.isError && (
            <p role="alert" className="text-body text-ink">
              아이 목록을 불러오지 못했어요.
            </p>
          )}
          {children.data && (
            <Stack gap="sm" align="start">
              {children.data.length === 0 ? (
                <p className="text-body text-ink-soft">아직 등록된 아이가 없어요.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {children.data.map((child) => (
                    <li key={child.childId} className="text-body text-ink">
                      {child.name} · 만 {child.age}세 ({child.birthYear}년생)
                    </li>
                  ))}
                </ul>
              )}
              {/* 등록된 아이가 있어도 더 등록하러 갈 수 있어야 한다.
                  수정·삭제 기능이 없으므로 "관리"라고 부르지 않는다.
                  문구는 앱 전체에서 쓰는 "등록"으로 통일한다 */}
              <Link href="/children">
                <TouchTarget look={children.data.length === 0 ? 'solid' : 'outline'}>
                  아이 등록하기
                </TouchTarget>
              </Link>
            </Stack>
          )}
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
