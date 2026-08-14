'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { login } from '@/features/auth/api';
import { loginErrorMessage } from '@/features/auth/error-message';
import { loginSchema, toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Stack, TouchTarget } from '@/shared/ui';

export function LoginForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => router.replace('/children'),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    mutation.mutate(parsed.data);
  }

  /*
   * 시안: 로그인이 실패하면 **두 칸 모두** 빨간 테두리가 된다.
   * 어느 쪽이 틀렸는지 서버가 알려주지 않고(알려주면 계정 존재 여부가 새어 나간다),
   * 아이 보호자가 둘 다 다시 보게 하는 편이 빠르다.
   * 테두리만 칠하고 칸마다 문구를 붙이지는 않는다 — 안내는 아래 한 줄로 충분하다
   */
  const serverFailed = mutation.isError;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        <Field
          label="이메일"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="parent@example.com"
          error={fieldErrors.email}
          invalid={serverFailed}
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
          invalid={serverFailed}
        />

        {mutation.isError && (
          <p role="alert" className="text-body font-medium text-danger">
            {loginErrorMessage(mutation.error)}
          </p>
        )}

        <TouchTarget type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? '로그인 중…' : '로그인'}
        </TouchTarget>
      </Stack>
    </form>
  );
}
