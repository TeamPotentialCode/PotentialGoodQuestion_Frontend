'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type SubmitEvent } from 'react';
import { ApiError } from '@/core/api/client';
import type { Child, ChildUpsertRequest } from '@/core/api/types';
import { createChild, updateChild } from '@/features/child-profile/api';
import { readBirthDate, saveBirthDate } from '@/features/child-profile/birth-date';
import { childErrorMessage } from '@/features/child-profile/error-message';
import { childSchema, toUpsertRequest } from '@/features/child-profile/schema';
import { toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Icon, Stack, TouchTarget } from '@/shared/ui';

interface ChildFormProps {
  /** 주면 수정, 없으면 신규 등록 */
  child?: Child;
  /** 저장이 끝난 뒤 화면이 다음 단계로 넘어가는 데 쓴다 */
  onDone?: (saved: Child) => void;
  /** 등록에서만 발생. */
  onLimitReached?: (message: string) => void;
}

export function ChildForm({ child, onDone, onLimitReached }: ChildFormProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isEditing = child !== undefined;

  // 백엔드에는 연도만 있다 — 이 기기에 남겨둔 전체 생년월일이 있으면 그걸 먼저 쓴다
  const defaultBirthDate = child
    ? (readBirthDate(child.childId) ?? `${child.birthYear}-01-01`)
    : '';
  // 저장할 때 필요해서 마지막 입력값을 들고 있는다
  const submittedBirthDate = useRef('');

  const mutation = useMutation({
    mutationFn: (request: ChildUpsertRequest) =>
      child ? updateChild(child.childId, request) : createChild(request),
    onSuccess: async (saved) => {
      saveBirthDate(saved.childId, submittedBirthDate.current);
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      // 등록은 연속 입력을 대비해 비우고, 수정은 화면이 곧 닫히므로 그대로 둔다
      if (!isEditing) formRef.current?.reset();
      onDone?.(saved);
    },
    onError: (error) => {
      if (!isEditing && error instanceof ApiError && error.status === 400) {
        onLimitReached?.(childErrorMessage(error));
      }
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name') ?? '').trim(),
      birthDate: String(form.get('birthDate') ?? '').trim(),
    };

    const parsed = childSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    submittedBirthDate.current = parsed.data.birthDate;
    // 화면은 생년월일을 받지만 백엔드는 출생연도만 받는다
    mutation.mutate(toUpsertRequest(parsed.data));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        {/* 사진은 백엔드에 저장할 곳이 없다 — 시안대로 자리만 둔다 */}
        <Stack gap="sm" align="center">
          <span
            aria-hidden
            className="flex size-20 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
          >
            <Icon name="camera" className="size-8" />
          </span>
          <p className="text-caption text-ink-faint">사진은 나중에 추가할 수 있어요</p>
        </Stack>

        <Field
          label="아이 이름"
          name="name"
          autoComplete="off"
          placeholder="이름을 입력해 주세요"
          defaultValue={child?.name}
          error={fieldErrors.name}
        />

        <Field
          label="생년월일"
          name="birthDate"
          type="date"
          defaultValue={defaultBirthDate}
          error={fieldErrors.birthDate}
          hint="아이에게 맞는 이야기와 활동을 제공하는 데 사용해요."
        />

        {mutation.isError && (
          <p role="alert" className="text-body text-ink">
            {childErrorMessage(mutation.error)}
          </p>
        )}

        <TouchTarget type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? (isEditing ? '수정 중…' : '저장 중…') : isEditing ? '수정하기' : '계속하기'}
        </TouchTarget>
      </Stack>
    </form>
  );
}
