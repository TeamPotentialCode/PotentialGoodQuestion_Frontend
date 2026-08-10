import Link from 'next/link';
import { SignupForm } from '@/features/auth/signup-form';
import { Stack } from '@/shared/ui';

export default function SignupPage() {
  return (
    <Stack gap="lg">
      <h1 className="text-display font-bold text-ink">회원가입</h1>
      <SignupForm />
      <p className="text-body text-ink-soft">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-semibold text-ink underline">
          로그인
        </Link>
      </p>
    </Stack>
  );
}
