import type { ReactNode } from 'react';
import { Screen, Stack } from '@/shared/ui';

// 인증 화면 공통 셸. 디자인 시안 전까지 회색 박스 + 토큰만 사용한다
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Screen scrollable className="justify-center py-10">
      <Stack gap="lg" className="mx-auto w-full max-w-lg">
        {children}
      </Stack>
    </Screen>
  );
}
