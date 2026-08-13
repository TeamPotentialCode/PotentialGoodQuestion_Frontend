'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type SubmitEvent } from 'react';
import { ApiError } from '@/core/api/client';
import type { Child, ChildUpsertRequest } from '@/core/api/types';
import { createChild, updateChild } from '@/features/child-profile/api';
import { childErrorMessage } from '@/features/child-profile/error-message';
import { childSchema, toUpsertRequest } from '@/features/child-profile/schema';
import { toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Stack, TouchTarget } from '@/shared/ui';

interface ChildFormProps {
  /** 주면 수정, 없으면 신규 등록 */
  child?: Child;
  /** 저장이 끝난 뒤 화면이 편집 모드를 닫는 데 쓴다 */
  onDone?: () => void;
  /** 등록에서만 발생. */
  onLimitReached?: (message: string) => void;
}

export function ChildForm({ child, onDone, onLimitReached }: ChildFormProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isEditing = child !== undefined;

  const mutation = useMutation({
    mutationFn: (request: ChildUpsertRequest) =>
      child ? updateChild(child.childId, request) : createChild(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      // 등록은 연속 입력을 대비해 비우고, 수정은 화면이 곧 닫히므로 그대로 둔다
      if (!isEditing) formRef.current?.reset();
      onDone?.();
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
    const rawAge = String(form.get('age') ?? '').trim();
    const input = {
      name: String(form.get('name') ?? '').trim(),
      // 빈 값이면 NaN 이 되어 zod 가 "숫자로 입력해 주세요"로 잡는다
      age: rawAge === '' ? Number.NaN : Number(rawAge),
    };

    const parsed = childSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    // 화면은 나이를 받지만 백엔드는 출생연도를 받는다
    mutation.mutate(toUpsertRequest(parsed.data));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        <Field
          label="아이 이름"
          name="name"
          autoComplete="off"
          defaultValue={child?.name}
          error={fieldErrors.name}
        />
        <Field
          label="나이"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          defaultValue={child?.age}
          hint="만 나이로 입력해 주세요. (1~20)"
          error={fieldErrors.age}
        />

        {mutation.isError && (
          <p role="alert" className="text-body text-ink">
            {childErrorMessage(mutation.error)}
          </p>
        )}

        <TouchTarget type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending
            ? isEditing
              ? '수정 중…'
              : '등록 중…'
            : isEditing
              ? '수정하기'
              : '등록하기'}
        </TouchTarget>
      </Stack>
    </form>
  );
}
