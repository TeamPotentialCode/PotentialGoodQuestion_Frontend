'use client';

import { useEffect } from 'react';
import type { WordInfo } from '@/core/api/types';
import { Icon, Stack, TouchTarget } from '@/shared/ui';

interface WordPopupProps {
  /** 아이가 누른 단어. 뜻이 오기 전에도 제목으로 먼저 보여준다 */
  word: string;
  /** 뜻·예시가 도착하면 채워진다. 아직이면 null */
  card: WordInfo | null;
  /** 저장이 실패했을 때 아이에게 보여줄 한 줄 */
  error: string | null;
  onClose: () => void;
}

/**
 * 단어를 누른 자리에서 바로 뜨는 뜻 카드.
 *
 * 뜻·예시는 백엔드가 저장 시점에 GPT 로 만들기 때문에 몇 초 걸린다.
 * 그래서 응답을 기다렸다 열지 않고 **누르는 즉시 열어** "만드는 중"을 보여준 뒤 채운다 —
 * 몇 초간 아무 반응이 없으면 아이는 고장 난 줄 안다.
 */
export function WordPopup({ word, card, error, onClose }: WordPopupProps) {
  // Esc 로도 닫힌다 (닫기 버튼 포커스는 autoFocus 가 맡는다)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${word} 뜻`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      {/* 카드 안을 눌렀을 때는 닫히지 않는다 — 아이가 글을 짚어가며 읽는다 */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card bg-white p-6 shadow-sm"
      >
        <Stack gap="md">
          <Stack direction="row" align="center" gap="sm">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-ink-soft"
            >
              <Icon name="bookmark" className="size-5 fill-ink text-ink" />
            </span>
            <h2 className="text-display font-extrabold text-ink">{card?.word ?? word}</h2>
          </Stack>

          {error ? (
            <p role="alert" className="text-bubble text-ink">
              {error}
            </p>
          ) : card === null ? (
            <Stack direction="row" align="center" gap="sm">
              <span aria-hidden className="flex items-center gap-1.5">
                {['0ms', '150ms', '300ms'].map((delay) => (
                  <span
                    key={delay}
                    className="size-2 animate-bounce rounded-full bg-ink-soft"
                    style={{ animationDelay: delay }}
                  />
                ))}
              </span>
              <p className="text-bubble text-ink-soft" aria-live="polite">
                뜻을 만들고 있어요…
              </p>
            </Stack>
          ) : (
            <Stack gap="sm">
              <p className="text-bubble text-ink">{card.meaning ?? '뜻을 만들고 있어요…'}</p>
              {card.exampleSentence && (
                <p className="text-body text-ink-soft">예: {card.exampleSentence}</p>
              )}
              {card.contextSentence && (
                <p className="border-l-2 border-line pl-3 text-caption text-ink-faint">
                  {card.contextSentence}
                </p>
              )}
            </Stack>
          )}

          {/* 모달이 열리면 아이가 바로 닫을 수 있게 포커스를 준다 */}
          <TouchTarget autoFocus size="lg" onClick={onClose} className="w-full">
            닫기
          </TouchTarget>
        </Stack>
      </div>
    </div>
  );
}
