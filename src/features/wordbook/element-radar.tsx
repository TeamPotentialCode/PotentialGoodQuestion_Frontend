import type { ThinkingElement } from '@/core/api/types';

/**
 * 사고 요소 8종 성장 레이더 (백엔드 6689fd7 의 elementCounts 시각화).
 *
 * 발표 가산점용으로 만든 기능이라 화면에 보여야 의미가 있다.
 * 라이브러리 없이 SVG 로 그린다 — 8각형 눈금 두 겹 + 값 다각형 + 축 라벨.
 */
const AXES: { key: ThinkingElement; label: string }[] = [
  { key: 'REASON', label: '이유' },
  { key: 'EMOTION', label: '감정' },
  { key: 'PERSPECTIVE', label: '관점' },
  { key: 'SOLUTION', label: '해결' },
  { key: 'REQUEST', label: '요청' },
  { key: 'RESULT', label: '결과' },
  { key: 'DECISION', label: '결정' },
  { key: 'EMPATHY', label: '공감' },
];

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 92;
const LABEL_RADIUS = RADIUS + 22;

function point(index: number, ratio: number): [number, number] {
  // 12시 방향부터 시계 방향으로 8축
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  return [CENTER + Math.cos(angle) * RADIUS * ratio, CENTER + Math.sin(angle) * RADIUS * ratio];
}

function ring(ratio: number): string {
  return AXES.map((_, i) => point(i, ratio).map((n) => n.toFixed(1)).join(',')).join(' ');
}

export function ElementRadar({ counts }: { counts: Partial<Record<string, number>> }) {
  const values = AXES.map(({ key }) => counts[key] ?? 0);
  const max = Math.max(...values, 1); // 전부 0이어도 눈금은 그린다
  const shape = AXES.map((_, i) => point(i, values[i] / max).map((n) => n.toFixed(1)).join(',')).join(' ');
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-64"
        role="img"
        aria-label={
          total === 0
            ? '사고 요소 성장 그래프 — 아직 기록이 없어요'
            : `사고 요소 성장 그래프 — ${AXES.map(({ key, label }) => `${label} ${counts[key] ?? 0}회`).join(', ')}`
        }
      >
        {/* 눈금 */}
        {[1, 0.66, 0.33].map((r) => (
          <polygon key={r} points={ring(r)} className="fill-none stroke-line" strokeWidth={1} />
        ))}
        {/* 축선 */}
        {AXES.map((_, i) => {
          const [x, y] = point(i, 1);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              className="stroke-line"
              strokeWidth={1}
            />
          );
        })}
        {/* 값 다각형 — 기록이 없으면 그리지 않는다 */}
        {total > 0 && (
          <polygon points={shape} className="fill-ink/15 stroke-ink" strokeWidth={2} />
        )}
        {total > 0 &&
          AXES.map((_, i) => {
            const [x, y] = point(i, values[i] / max);
            return <circle key={i} cx={x} cy={y} r={3.5} className="fill-ink" />;
          })}
        {/* 라벨 */}
        {AXES.map(({ key, label }, i) => {
          const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * LABEL_RADIUS;
          const y = CENTER + Math.sin(angle) * LABEL_RADIUS;
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink-soft text-[13px]"
            >
              {label}
            </text>
          );
        })}
      </svg>
      {total === 0 && (
        <figcaption className="text-caption text-ink-soft">
          이야기를 마치면 여기에 생각의 발자국이 쌓여요.
        </figcaption>
      )}
    </figure>
  );
}
