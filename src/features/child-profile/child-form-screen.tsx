'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Child } from '@/core/api/types';
import { ChildForm } from '@/features/child-profile/child-form';
import { Screen, Stack, SubHeader } from '@/shared/ui';

/**
 * CHILD-02 — 아이 등록·수정 화면.
 * 시안이 목록과 폼을 다른 화면으로 나눠서, 등록(/children/new)과 수정(/children/{id}/edit)이 이걸 함께 쓴다.
 */
export function ChildFormScreen({ child }: { child?: Child }) {
  const router = useRouter();

  return (
    <Screen scrollable className="py-6" data-testid="child-form">
      <SubHeader title="아이 정보를 알려 주세요" backHref="/children" />

      <Stack gap="lg" className="mx-auto w-full max-w-5xl pt-14">
        <div className="mx-auto w-full max-w-[460px] rounded-card border border-line bg-white p-8">
          <Stack gap="md">
            {/*
             * 신규 등록은 곧바로 보호자 동의로 넘어간다 —
             * 동의가 없으면 아이의 활동을 시작할 수 없다는 MVP 규칙 때문이다.
             * 수정은 이미 동의를 받은 아이라 목록으로 돌아간다
             */}
            <ChildForm
              child={child}
              onDone={(saved) =>
                router.push(child ? '/children' : `/children/${saved.childId}/consent`)
              }
            />
            <Link
              href="/children"
              className="text-center text-body font-medium text-ink underline"
            >
              취소
            </Link>
          </Stack>
        </div>
      </Stack>
    </Screen>
  );
}
