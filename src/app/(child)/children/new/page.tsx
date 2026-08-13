'use client';

import { useRequireAuth } from '@/features/auth/use-session';
import { ChildFormScreen } from '@/features/child-profile/child-form-screen';
import { Screen } from '@/shared/ui';

export default function NewChildPage() {
  const authenticated = useRequireAuth();
  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }
  return <ChildFormScreen />;
}
