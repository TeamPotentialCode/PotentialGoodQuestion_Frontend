'use client';

import { useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { Icon } from '@/shared/ui/icon';

interface ImageSlotProps {
  /** 이미지가 아직 없을 때 자리에 적는 설명 */
  label: string;
  src?: string | null;
  /** thumb 은 목록·카드 안의 작은 자리, bare 는 치수를 호출부 className 이 전부 정한다 */
  size?: 'full' | 'thumb' | 'bare';
  className?: string;
}

/**
 * 삽화 자리. 이미지가 없거나 못 불러오면 회색 박스를 보여준다 —
 * 아이 화면에 깨진 이미지 아이콘이 뜨는 것보다 낫다.
 * 폰 세로에서는 낮게, 태블릿 가로에서는 높게 — 폰에서 조작부가 화면 밖으로 밀리지 않게 한다
 */
export function ImageSlot({ label, src = null, size = 'full', className }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-card border border-line bg-surface',
        size === 'full' && 'min-h-40 md:min-h-80',
        size === 'thumb' && 'min-h-24 w-32 shrink-0 md:min-h-28 md:w-40',
        className,
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스팅 확정 후 next/image 전환
        <img
          key={src}
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex flex-col items-center gap-2 text-ink-soft">
          <Icon name="image" className="size-10" />
          <span className="text-caption">{label}</span>
        </span>
      )}
    </div>
  );
}
