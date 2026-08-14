'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/ui/cn';
import { Icon } from '@/shared/ui/icon';

interface TabItem {
  href: string;
  label: string;
  icon: 'home' | 'book' | 'bookmark' | 'person';
  /** 화면이 아직 없는 탭. 자리는 두되 눌러도 이동하지 않는다 */
  disabled?: boolean;
}

/**
 * 화면 하단 탭.
 *
 * 시안대로 4개. 단어장·마이페이지는 디자이너가 "작동 안 해도 된다"고 한 화면이지만
 * 배포본에 API 가 있어 붙였다 — 없으면 빈 상태로 떨어진다.
 *
 * sticky 로 만들었다가 되돌렸다. Screen 은 min-h-dvh 라 내용이 넘치면 자기가 늘어나고
 * 문서가 스크롤된다 — 스크롤 컨테이너가 아니라서 sticky 가 붙을 곳이 없고 탭바가 화면 밖으로 잘렸다.
 * 그래서 fixed 로 띄우고, 같은 높이의 자리표시를 함께 렌더해 본문 끝이 가려지지 않게 한다.
 * 자리표시가 컴포넌트 안에 있으니 쓰는 쪽은 <TabBar /> 하나만 두면 된다.
 */
const BAR_HEIGHT = 'h-[4.5rem]';
const TABS: TabItem[] = [
  { href: '/home', label: '홈', icon: 'home' },
  { href: '/stories', label: '이야기', icon: 'book' },
  { href: '/words', label: '단어장', icon: 'bookmark' },
  { href: '/me', label: '마이페이지', icon: 'person' },
];

export function TabBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* 고정 탭이 본문 끝을 가리지 않게 같은 높이만큼 자리를 비워 둔다 */}
      <div aria-hidden className={cn('mt-auto w-full shrink-0', BAR_HEIGHT)} />

      <nav
        aria-label="주요 메뉴"
        className={cn(
          'fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface',
          'pb-[env(safe-area-inset-bottom)]',
          className,
        )}
      >
        <ul className={cn('mx-auto flex w-full max-w-2xl items-center justify-around', BAR_HEIGHT)}>
          {TABS.map((tab) => {
            const active = !tab.disabled && (pathname === tab.href || pathname.startsWith(`${tab.href}/`));
            const inner = (
              <>
                <Icon name={tab.icon} className="size-6" />
                <span className={cn('text-caption', active && 'font-semibold')}>{tab.label}</span>
              </>
            );
            const shape = cn(
              'flex min-h-touch flex-col items-center justify-center gap-1 px-5',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
              active ? 'text-ink' : 'text-ink-soft',
            );
            return (
              <li key={tab.href}>
                {tab.disabled ? (
                  <button type="button" disabled title="준비 중이에요" className={cn(shape, 'opacity-40')}>
                    {inner}
                  </button>
                ) : (
                  <Link href={tab.href} aria-current={active ? 'page' : undefined} className={shape}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
