'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { signup } from '@/features/auth/api';
import { signupErrorMessage } from '@/features/auth/error-message';
import { signupSchema, toFieldErrors, type FieldErrors } from '@/features/auth/schema';
import { Field, Stack, TouchTarget } from '@/shared/ui';

export function SignupForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: signup,
    // 가입 응답이 곧바로 토큰을 주므로 별도 로그인 없이 다음 단계로 보낸다
    onSuccess: () => router.replace('/home'),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      email: String(form.get('email') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    };

    const parsed = signupSchema.safeParse(input);
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
        <Field label="보호자 이름" name="name" autoComplete="name" error={fieldErrors.name} />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="8자 이상 입력해 주세요."
          error={fieldErrors.password}
        />

        {mutation.isError && (
          <p role="alert" className="text-body text-ink">
            {signupErrorMessage(mutation.error)}
          </p>
        )}

        <TouchTarget type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? '가입 중…' : '회원가입'}
        </TouchTarget>
      </Stack>
    </form>
  );
}
