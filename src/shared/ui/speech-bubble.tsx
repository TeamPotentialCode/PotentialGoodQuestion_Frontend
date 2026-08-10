import type { HTMLAttributes, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/ui/cn';

interface SpeechBubbleProps extends HTMLAttributes<HTMLDivElement> {
  speaker: 'character' | 'child' | 'narration';
  /** transcribing 중 아이 말풍선 내부 점 애니메이션 (모션 위치) */
  pending?: boolean;
  /** 말풍선 안 아래에 붙는 보조 줄 — 주석·"다시 듣기" 처럼 대사에 딸린 것 */
  footer?: ReactNode;
}

const bubble = cva('max-w-[34rem] rounded-card px-5 py-3 text-bubble', {
  variants: {
    speaker: {
      character: 'self-start bg-bubble-character',
      child: 'self-end bg-bubble-child',
      narration: 'self-center bg-bubble-narration text-ink-soft',
    },
  },
});

export function SpeechBubble({
  speaker,
  pending = false,
  footer,
  className,
  children,
  ...rest
}: SpeechBubbleProps) {
  return (
    <div className={cn(bubble({ speaker }), className)} {...rest}>
      {pending ? (
        <span aria-hidden className="flex items-center gap-1.5 py-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
      ) : (
        children
      )}
      {footer && <div className="mt-2 flex items-center gap-3">{footer}</div>}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-2 animate-bounce rounded-full bg-ink-soft"
      style={{ animationDelay: delay }}
    />
  );
}
