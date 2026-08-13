import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';
import { SocialButtons } from '@/features/auth/social-buttons';
import { AuthCard, Stack } from '@/shared/ui';

export default function LoginPage() {
  return (
    <AuthCard title="아이의 생각을 이야기로 키워 주세요" subtitle="보호자 계정으로 로그인해 주세요">
      <Stack gap="md">
        <LoginForm />

        <div className="flex items-center justify-between gap-4">
          <Link href="/signup" className="text-caption font-medium text-ink underline">
            회원가입
          </Link>
          {/* 비밀번호 찾기는 백엔드 API 가 없다 — 모양만 두고 비활성 */}
          <button
            type="button"
            disabled
            title="준비 중이에요"
            className="text-caption font-medium text-ink underline disabled:opacity-40"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <SocialButtons />

        <p className="pt-2 text-center text-caption text-ink-soft">
          이용약관 및 개인정보 처리방침
        </p>
      </Stack>
    </AuthCard>
  );
}
