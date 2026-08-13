'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type SubmitEvent } from 'react';
import { ApiError } from '@/core/api/client';
import type { Child, ChildUpsertRequest } from '@/core/api/types';
import { createChild, updateChild } from '@/features/child-profile/api';
import { childErrorMessage } from '@/features/child-profile/error-message';
import { childSchema, toUpsertRequest } from '@/features/child-profile/schema';
import { toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Icon, Stack, TouchTarget } from '@/shared/ui';

// 시안이 제시한 나이 선택지. 대상 연령이 바뀌면 여기만 고친다
const AGE_CHOICES = [6, 7, 8, 9];

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
  // 시안의 나이 칩. 수정 중이면 기존 나이를 고른 상태로 시작한다
  const [age, setAge] = useState<number | null>(child?.age ?? null);
  const isEditing = child !== undefined;

  const mutation = useMutation({
    mutationFn: (request: ChildUpsertRequest) =>
      child ? updateChild(child.childId, request) : createChild(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      // 등록은 연속 입력을 대비해 비우고, 수정은 화면이 곧 닫히므로 그대로 둔다
      if (!isEditing) {
        formRef.current?.reset();
        setAge(null);
      }
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
        {/* 사진은 백엔드에 저장할 곳이 없다 — 시안대로 자리만 둔다 */}
        <Stack gap="sm" align="center">
          <span
            aria-hidden
            className="flex size-20 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
          >
            <Icon name="image" className="size-8" />
          </span>
          <p className="text-caption text-ink-soft">사진은 나중에 추가할 수 있어요</p>
        </Stack>

        <Field
          label="아이 이름"
          name="name"
          autoComplete="off"
          placeholder="이름을 입력해 주세요"
          defaultValue={child?.name}
          error={fieldErrors.name}
        />

        {/* 시안은 나이를 칩으로 고르게 한다 — 아이 대상이라 숫자 입력보다 쉽다 */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-body font-medium text-ink">나이</legend>
          <input type="hidden" name="age" value={age ?? ''} readOnly />
          <Stack direction="row" gap="sm" className="flex-wrap">
            {AGE_CHOICES.map((n) => (
              <TouchTarget
                key={n}
                type="button"
                look={n === age ? 'solid' : 'outline'}
                aria-pressed={n === age}
                onClick={() => setAge(n)}
              >
                {n}세
              </TouchTarget>
            ))}
          </Stack>
          <p className="text-caption text-ink-soft">
            아이에게 맞는 이야기와 문구를 보여 주는 데 사용돼요.
          </p>
          {fieldErrors.age && (
            <p role="alert" className="text-caption font-medium text-ink">
              {fieldErrors.age}
            </p>
          )}
        </fieldset>

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
