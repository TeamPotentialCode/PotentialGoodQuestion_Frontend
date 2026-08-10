'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type SubmitEvent } from 'react';
import { ApiError } from '@/core/api/client';
import { createChild } from '@/features/child-profile/api';
import { childErrorMessage } from '@/features/child-profile/error-message';
import { childSchema } from '@/features/child-profile/schema';
import { toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Stack, TouchTarget } from '@/shared/ui';

interface ChildFormProps {
  /** 서버가 정원 초과(400)를 알려줬을 때. 등록 가능 인원은 백엔드만 알고 있다 */
  onLimitReached?: (message: string) => void;
}

export function ChildForm({ onLimitReached }: ChildFormProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: createChild,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      formRef.current?.reset(); // 연속 등록을 대비해 입력을 비운다
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
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
    mutation.mutate(parsed.data);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        <Field label="아이 이름" name="name" autoComplete="off" error={fieldErrors.name} />
        <Field
          label="나이"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          hint="만 나이로 입력해 주세요. (1~20)"
          error={fieldErrors.age}
        />

        {mutation.isError && (
          <p role="alert" className="text-body text-ink">
            {childErrorMessage(mutation.error)}
          </p>
        )}

        <TouchTarget type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? '등록 중…' : '등록하기'}
        </TouchTarget>
      </Stack>
    </form>
  );
}
