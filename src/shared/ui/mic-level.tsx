import { cn } from '@/shared/ui/cn';

/**
 * 마이크 입력 막대 5칸 — 소리가 클수록 많이 켜진다.
 *
 * 녹음하는 화면이 둘(대화·다시 말하기)이라 공용으로 둔다.
 * "음성이 안 들어간다" 를 눈으로 가릴 수 있게 하는 게 목적이다 —
 * 막대가 안 움직이면 장치 문제, 움직이는데 인식이 안 되면 STT 문제다.
 */
export function MicLevel({ level }: { level: number }) {
  const lit = Math.round(level * 5);
  return (
    <span aria-hidden className="flex items-end gap-1.5" data-testid="mic-level" data-level={lit}>
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn(
            'w-2.5 rounded-full duration-(--motion-fast)',
            step <= lit ? 'bg-ink' : 'bg-line',
          )}
          style={{ height: `${8 + step * 5}px` }}
        />
      ))}
    </span>
  );
}
