import type { SVGProps } from 'react';
import { cn } from '@/shared/ui/cn';

type IconName =
  | 'wave'
  | 'speaker'
  | 'image'
  | 'person'
  | 'close'
  | 'mic'
  | 'grip'
  | 'check'
  | 'home'
  | 'book'
  | 'eye'
  | 'eye-off'
  | 'back'
  | 'chevron-down'
  | 'star'
  | 'chat'
  | 'refresh'
  | 'bookmark'
  | 'clock';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
}

// 시안의 단색 선 아이콘. 항상 장식이므로 aria-hidden 이고, 의미는 옆의 글자가 진다
export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5 shrink-0', className)}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

const paths: Record<IconName, React.ReactNode> = {
  // 소리 파형 — 장면 설명이 음성으로 재생된다는 표시
  wave: (
    <>
      <path d="M4 10v4" />
      <path d="M8 6v12" />
      <path d="M12 3v18" />
      <path d="M16 7v10" />
      <path d="M20 10v4" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5L5 20" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  // 드래그 손잡이 — 카드를 잡아 옮길 수 있다는 표시
  grip: (
    <>
      <path d="M6 10h12" />
      <path d="M6 14h12" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M2 12s3.6-6 10-6c1.6 0 3 .4 4.2 1M22 12s-3.6 6-10 6c-1.6 0-3-.4-4.2-1" />
      <path d="m3 3 18 18" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  star: <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z" />,
  chat: <path d="M20 5v9a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </>
  ),
  bookmark: <path d="M6 4h12v16l-6-4-6 4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  close: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
};
