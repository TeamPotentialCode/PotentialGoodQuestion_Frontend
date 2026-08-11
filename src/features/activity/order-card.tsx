'use client';

import { useSortable } from '@dnd-kit/sortable';
import type { ActivityCard } from '@/core/api/types';
import { cn, Icon } from '@/shared/ui';

interface OrderCardProps {
  card: ActivityCard;
  /** 몇 번째 자리인지 (1부터) */
  slot: number;
}

/**
 * 순서 맞추기의 카드 한 장. 드래그로 자리를 바꾼다.
 *
 * 카드 id(card_1 …)는 정답 순서를 그대로 담고 있어 화면에 내보내지 않는다 —
 * data-card-id 는 E2E 단언용이며 사용자 눈에는 보이지 않는다.
 */
export function OrderCard({ card, slot }: OrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  // @dnd-kit/utilities 가 호이스트되지 않아 CSS.Transform.toString 을 쓸 수 없다.
  // 같은 문자열을 직접 만든다
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li className="flex flex-col gap-2" data-card-id={card.id} data-slot={slot}>
      <span className="flex items-center gap-2 text-caption text-ink-soft">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-cta-ink">
          {slot}
        </span>
        번째 자리
      </span>

      <button
        ref={setNodeRef}
        style={style}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${slot}번째 자리: ${card.text}. 스페이스바를 누른 뒤 좌우 화살표로 자리를 옮기세요`}
        className={cn(
          'flex h-full cursor-grab flex-col items-center gap-3 rounded-card border border-line bg-surface p-4 text-left',
          'touch-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
          isDragging && 'z-10 opacity-80 shadow-lg',
        )}
      >
        <span className="flex w-full flex-1 items-center justify-center rounded-card bg-surface-raised py-6 text-ink-soft">
          <Icon name="image" className="size-8" />
        </span>
        <span className="text-caption text-ink">{card.text}</span>
        <Icon name="grip" className="text-ink-soft" />
      </button>
    </li>
  );
}
