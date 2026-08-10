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
    onSuccess: () => router.replace('/home'),
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
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        {mutation.isError && (
          <p role="alert" className="text-body text-ink">
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
