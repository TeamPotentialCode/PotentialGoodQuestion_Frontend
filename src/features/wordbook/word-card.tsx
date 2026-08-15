'use client';

import type { WordInfo } from '@/core/api/types';
import { cn, Icon, Stack, TouchTarget } from '@/shared/ui';

interface WordCardProps {
  word: WordInfo;
  onToggleFavorite: (wordId: number) => void;
  /** 토글 요청이 도는 동안 버튼을 잠근다 */
  busy?: boolean;
}

/**
 * 단어장 카드 한 장 — 단어·뜻·예시·이야기 속 문장.
 *
 * 뜻과 예시는 백엔드가 저장 시점에 GPT 로 만든다. 아직 안 왔으면(null) 만드는 중이라고 알린다 —
 * 빈칸으로 두면 "저장이 안 됐나" 로 읽힌다.
 */
export function WordCard({ word, onToggleFavorite, busy = false }: WordCardProps) {
  const pending = word.meaning === null;

  return (
    <li className="rounded-card border border-line bg-white p-5">
      <Stack direction="row" align="start" justify="between" gap="md">
        <Stack gap="sm" className="min-w-0 flex-1">
          <Stack direction="row" align="center" gap="sm">
            <h3 className="text-title font-extrabold text-ink">{word.word}</h3>
            {word.source === 'PARENT' && (
              <span className="rounded-[4px] bg-surface-raised px-2 py-0.5 text-[12px] font-bold text-ink-soft">
                보호자
              </span>
            )}
          </Stack>

          {pending ? (
            <p className="text-body text-ink-faint" aria-live="polite">
              뜻을 만들고 있어요…
            </p>
          ) : (
            <p className="text-body text-ink">{word.meaning}</p>
          )}

          {word.exampleSentence && (
            <p className="text-caption text-ink-soft">예: {word.exampleSentence}</p>
          )}
          {word.contextSentence && (
            <p className="border-l-2 border-line pl-3 text-caption text-ink-faint">
              {word.contextSentence}
            </p>
          )}
        </Stack>

        <TouchTarget
          size="sm"
          look="ghost"
          disabled={busy}
          aria-pressed={word.favorite}
          aria-label={`${word.word} 즐겨찾기`}
          onClick={() => onToggleFavorite(word.wordId)}
          className={cn('shrink-0 px-2', word.favorite ? 'text-ink' : 'text-ink-faint')}
        >
          <Icon name="star" className={cn('size-6', word.favorite && 'fill-ink')} />
        </TouchTarget>
      </Stack>
    </li>
  );
}
