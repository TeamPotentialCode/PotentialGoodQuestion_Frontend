'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Icon, Screen, Stack, SubHeader, TouchTarget } from '@/shared/ui';

/**
 * 보호자 동의 — 아이 등록 바로 다음 단계.
 *
 * 백엔드 MVP 규칙: 동의가 없거나 철회된 아이는 새 세션을 시작할 수 없다.
 * (`ChildConsentService` 주석 참고. 세션 시작 쪽 검증은 아직 붙지 않았지만 먼저 맞춰 둔다)
 */
export function ConsentScreen({ child }: { child: Child }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // 세션 시작이 동의 부족으로 막혀서 온 경우, 끝나면 보던 이야기로 돌려보낸다.
  // 외부 주소로 새는 것을 막으려고 내부 경로(/)만 받는다
  const rawNext = useSearchParams().get('next');
  const next = rawNext?.startsWith('/') ? rawNext : '/children';
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
      router.replace(next);
    },
  });

  return (
    <Screen scrollable className="py-6" data-testid="child-consent">
      <SubHeader title="보호자 동의" backHref="/children" />

      <Stack gap="lg" className="mx-auto w-full max-w-5xl pt-16">
        <div className="mx-auto w-full max-w-[460px] rounded-card border border-line bg-white p-8">
          <Stack gap="lg">
            <Stack gap="sm">
              <h2 className="text-display font-extrabold text-ink">보호자 동의가 필요해요</h2>
              <p className="text-body text-ink-soft">
                굿퀘스천 이용을 위해 아동 개인정보 수집·이용에 대한 보호자 동의가 필요해요.
              </p>
            </Stack>

            <Stack gap="sm" className="rounded-control bg-surface-raised px-4 py-3">
              <p className="text-caption text-ink-faint">등록할 아동 정보</p>
              <p className="flex items-center gap-2 text-bubble font-bold text-ink">
                <span
                  aria-hidden
                  className="flex size-7 items-center justify-center rounded-full bg-line text-ink-soft"
                >
                  <Icon name="smile" className="size-4" />
                </span>
                {child.name} · {birth} ({child.age}세)
              </p>
            </Stack>

            <div className="rounded-cta border border-line-strong p-4">
              <label className="flex items-start gap-3 text-body text-ink">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.currentTarget.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-bold">아동 개인정보 수집·이용 동의 (필수)</span>
                  <span className="text-ink-soft">
                    서비스 이용 및 활동 기록 저장을 위해 필요한 정보예요.
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="mt-2 ml-8 min-h-touch text-caption font-semibold text-ink underline"
              >
                자세히 보기 &gt;
              </button>
            </div>

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
      <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-6">
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
