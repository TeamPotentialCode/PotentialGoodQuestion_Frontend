import Link from 'next/link';
import { SignupForm } from '@/features/auth/signup-form';
import { AuthCard, Stack } from '@/shared/ui';

export default function SignupPage() {
  return (
    <AuthCard title="아이의 생각을 이야기로 키워 주세요" subtitle="보호자 계정을 만들어 주세요">
      <Stack gap="md">
        <SignupForm />
        <p className="text-center text-caption text-ink-soft">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-ink underline">
            로그인
          </Link>
        </p>
      </Stack>
    </AuthCard>
  );
}
