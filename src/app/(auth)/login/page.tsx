import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';
import { Stack } from '@/shared/ui';

export default function LoginPage() {
  return (
    <Stack gap="lg">
      <h1 className="text-display font-bold text-ink">로그인</h1>
      <LoginForm />
      <p className="text-body text-ink-soft">
        아직 계정이 없으신가요?{' '}
        <Link href="/signup" className="font-semibold text-ink underline">
          회원가입
        </Link>
      </p>
    </Stack>
  );
}
