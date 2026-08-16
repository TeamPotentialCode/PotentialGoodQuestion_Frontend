import Image from 'next/image';
import { Stack } from '@/shared/ui';

/**
 * 시안의 소셜 로그인 자리.
 *
 * 백엔드에 OAuth 설정은 있지만 리다이렉트 경로·응답 계약을 확인한 적이 없어 **비활성**으로 둔다.
 * 눌리는데 아무 일도 안 하거나 엉뚱한 곳으로 가는 것보다, 아직 준비 중임을 분명히 보이는 편이 낫다.
 * 계약이 나오면 여기만 링크로 바꾸면 된다.
 */
const PROVIDERS = [
  { key: 'google', icon: '/google-icon.png', label: 'Google로 계속하기' },
  { key: 'naver', icon: '/naver-icon.png', label: '네이버로 계속하기' },
];

export function SocialButtons() {
  return (
    <Stack gap="sm">
      <div className="flex items-center gap-3 py-2">
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span className="text-caption text-ink-soft">또는</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>

      {PROVIDERS.map((p) => (
        <button
          key={p.key}
          type="button"
          disabled
          title="준비 중이에요"
          className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-white text-body font-semibold text-ink disabled:opacity-60"
        >
          <Image src={p.icon} alt={p.key} width={24} height={24} />
          {p.label}
        </button>
      ))}
    </Stack>
  );
}
