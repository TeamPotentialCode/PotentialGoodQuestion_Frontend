'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Child } from '@/core/api/types';
import { ChildForm } from '@/features/child-profile/child-form';
import { Icon, Screen, Stack } from '@/shared/ui';

/**
 * CHILD-02 — 아이 등록·수정 화면.
 * 시안이 목록과 폼을 다른 화면으로 나눠서, 등록(/children/new)과 수정(/children/{id}/edit)이 이걸 함께 쓴다.
 */
export function ChildFormScreen({ child }: { child?: Child }) {
  const router = useRouter();

  return (
    <Screen scrollable className="py-6" data-testid="child-form">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack direction="row" align="center" gap="md" className="border-b border-line pb-3">
          <Link
            href="/children"
            className="flex min-h-touch items-center gap-1 text-body text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="back" className="size-5" />
            뒤로
          </Link>
          <h1 className="flex-1 text-center text-body font-semibold text-ink">
            아이 정보를 알려 주세요
          </h1>
          <span aria-hidden className="min-w-16" />
        </Stack>

        <div className="mx-auto w-full max-w-lg rounded-card border border-line bg-surface p-8">
          <Stack gap="md">
            <ChildForm child={child} onDone={() => router.push('/children')} />
            <Link
              href="/children"
              className="text-center text-caption font-medium text-ink underline"
            >
              취소
            </Link>
          </Stack>
        </div>
      </Stack>
    </Screen>
  );
}
