import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/ui/cn';
import { Icon } from '@/shared/ui/icon';

interface CharacterProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  imageUrl?: string | null;
  /** speaking: 입 위치 점 애니메이션 / thinking: 캐릭터 위 점 3개 (모션 위치) */
  state?: 'idle' | 'speaking' | 'thinking';
  size?: 'sm' | 'md' | 'lg';
  /** 대화 화면은 작은 원형 아바타를 쓴다 */
  shape?: 'card' | 'circle';
  /** 이름을 아래에 함께 보여줄지 */
  showName?: boolean;
}

const box = cva('relative flex items-center justify-center bg-surface-raised', {
  variants: {
    size: {
      sm: 'size-20',
      md: 'size-40 md:size-56',
      lg: 'size-56 md:size-72',
    },
    shape: {
      card: 'rounded-card',
      circle: 'rounded-full',
    },
  },
  defaultVariants: { size: 'md', shape: 'card' },
});

export function Character({
  name,
  imageUrl = null,
  state = 'idle',
  size,
  shape,
  showName = false,
  className,
  ...rest
}: CharacterProps) {
  const round = shape === 'circle';
  return (
    <div className={cn('flex flex-col items-center gap-2', className)} {...rest}>
      {state === 'thinking' && (
        <div aria-hidden className="flex gap-1.5">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </div>
      )}
      <div aria-hidden className={box({ size, shape })}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 회색박스 단계, 시안 후 next/image 전환
          <img
            src={imageUrl}
            alt=""
            className={cn('size-full object-cover', round ? 'rounded-full' : 'rounded-card')}
          />
        ) : round ? (
          <Icon name="person" className="size-1/2 text-ink-soft" />
        ) : (
          <span className="text-title text-ink-soft">{name}</span>
        )}
        {state === 'speaking' && (
          <span className="absolute bottom-[22%] left-1/2 size-3 -translate-x-1/2 animate-pulse rounded-full bg-ink-soft" />
        )}
      </div>
      {showName && <p className="text-body font-semibold text-ink">{name}</p>}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-2.5 animate-bounce rounded-full bg-ink-soft"
      style={{ animationDelay: delay }}
    />
  );
}
