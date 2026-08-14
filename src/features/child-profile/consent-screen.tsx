'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Child } from '@/core/api/types';
import { createConsent } from '@/features/child-profile/api';
import { readBirthDate } from '@/features/child-profile/birth-date';
import {
  CONSENT_SECTIONS,
  CONSENT_VERSION,
  VERIFICATION_METHOD,
} from '@/features/child-profile/consent-copy';
import { childErrorMessage } from '@/features/child-profile/error-message';
import { formatBirthDate } from '@/features/child-profile/schema';
import { Icon, Screen, Stack, TouchTarget } from '@/shared/ui';

/**
 * 보호자 동의 — 아이 등록 바로 다음 단계.
 *
 * 백엔드 MVP 규칙: 동의가 없거나 철회된 아이는 새 세션을 시작할 수 없다.
 * (`ChildConsentService` 주석 참고. 세션 시작 쪽 검증은 아직 붙지 않았지만 먼저 맞춰 둔다)
 */
export function ConsentScreen({ child }: { child: Child }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const birthDate = readBirthDate(child.childId);
  const birth = birthDate ? formatBirthDate(birthDate) : `${child.birthYear}년생`;

  const consent = useMutation({
    mutationFn: () =>
      createConsent(child.childId, {
        consentVersion: CONSENT_VERSION,
        verificationMethod: VERIFICATION_METHOD,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      router.replace('/children');
    },
  });

  return (
    <Screen scrollable className="py-6" data-testid="child-consent">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <Stack direction="row" align="center" gap="md" className="border-b border-line pb-3">
          <Link
            href="/children"
            className="flex min-h-touch items-center gap-1 text-body text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
          >
            <Icon name="back" className="size-5" />
            뒤로
          </Link>
          <h1 className="flex-1 text-center text-body font-semibold text-ink">보호자 동의</h1>
          <span aria-hidden className="min-w-16" />
        </Stack>

        <div className="mx-auto w-full max-w-lg rounded-card border border-line bg-surface p-8">
          <Stack gap="lg">
            <h2 className="text-title font-semibold text-ink">보호자 동의가 필요해요</h2>

            <Stack gap="sm">
              <p className="text-caption text-ink-soft">등록할 아동 정보</p>
              <p className="rounded-card bg-surface-raised px-4 py-3 text-body text-ink">
                {child.name} · {birth} ({child.age}세)
              </p>
            </Stack>

            <Stack direction="row" align="center" justify="between" gap="md">
              <label className="flex flex-1 items-center gap-3 text-body text-ink">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.currentTarget.checked)}
                  className="size-6 shrink-0 accent-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                />
                아동 개인정보 수집·이용 동의 (필수)
              </label>
              <TouchTarget
                size="sm"
                look="ghost"
                className="text-ink-soft"
                onClick={() => setDetailOpen(true)}
              >
                자세히 보기 ›
              </TouchTarget>
            </Stack>

            {consent.isError && (
              <p role="alert" className="text-body text-ink">
                {childErrorMessage(consent.error)}
              </p>
            )}

            <TouchTarget
              size="lg"
              disabled={!agreed || consent.isPending}
              onClick={() => consent.mutate()}
            >
              {consent.isPending ? '저장 중…' : '동의하고 계속하기'}
            </TouchTarget>

            <p className="text-center text-caption text-ink-soft">
              동의하지 않으면 아이의 활동을 시작할 수 없어요.
            </p>
          </Stack>
        </div>
      </Stack>

      {detailOpen && <ConsentDetail onClose={() => setDetailOpen(false)} />}
    </Screen>
  );
}

function ConsentDetail({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="아동 개인정보 수집·이용 안내"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6">
        <Stack gap="lg">
          <Stack direction="row" align="center" justify="between" gap="md">
            <h2 className="text-title font-semibold text-ink">아동 개인정보 수집·이용 안내</h2>
            <TouchTarget size="sm" look="ghost" aria-label="닫기" onClick={onClose}>
              <Icon name="close" className="size-5" />
            </TouchTarget>
          </Stack>

          {CONSENT_SECTIONS.map((section) => (
            <Stack key={section.title} gap="sm">
              <h3 className="text-body font-semibold text-ink">{section.title}</h3>
              <p className="text-caption text-ink-soft">{section.body}</p>
            </Stack>
          ))}

          <TouchTarget size="lg" look="outline" onClick={onClose}>
            닫기
          </TouchTarget>
        </Stack>
      </div>
    </div>
  );
}
