'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { WordInfo, WordList } from '@/core/api/types';
import { splitLines, splitTokens } from '@/core/wordbook/tokenize';
import { growthKey, saveWord, wordsKey } from '@/features/wordbook/api';
import { wordSaveMessage, wordSaveOutcome } from '@/features/wordbook/error-message';
import { getSavedWords, markWordSaved } from '@/features/wordbook/saved-words';
import { cn, Icon, TouchTarget } from '@/shared/ui';

interface WordCatchProps {
  /** 지금 활동 중인 아이. 없으면(세션 로딩 전 등) 담기 기능을 아예 내보내지 않는다 */
  childId: number | null;
  text: string;
  /** 담기 토글 옆에 나란히 놓을 것 — 낭독 패널의 "다시 듣기" */
  footer?: ReactNode;
}

type SaveState = 'saving' | 'saved' | 'duplicate' | 'error';

/**
 * 낭독 본문 + "단어 담기" 모드.
 *
 * 평소에는 **그냥 글**이다. 모드를 켜야 단어가 눌리는 버튼이 된다 —
 * 아이가 이야기를 읽는 동안 글자마다 버튼이면 읽기를 방해하고, 오탭도 는다.
 *
 * 저장은 백엔드에서 GPT 를 부르기 때문에 느리다(실측 19~38초). 그래서
 * 모달로 막지 않고, 누른 단어 자신이 담기는 중 → 담음으로 변한다.
 * 여러 단어를 연달아 눌러도 각각이 따로 진행된다(useMutation 하나로는 최신 것만 남는다).
 */
export function WordCatch({ childId, text, footer }: WordCatchProps) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [notice, setNotice] = useState('');

  // 이 기기에 남은 기록 — 화면이 바뀌어도 "담음" 표시가 유지된다
  const alreadySaved = childId === null ? new Set<string>() : getSavedWords(childId);

  async function pick(word: string, sentence: string) {
    if (childId === null) return;
    // 이미 담은 단어는 요청 자체를 보내지 않는다 (서버 중복 응답 형태에 기대지 않는다)
    if (states[word] === 'saving' || states[word] === 'saved' || alreadySaved.has(word)) {
      setStates((prev) => ({ ...prev, [word]: 'duplicate' }));
      setNotice('이미 담아 뒀어!');
      return;
    }

    setStates((prev) => ({ ...prev, [word]: 'saving' }));
    setNotice(`"${word}" 담는 중…`);
    try {
      const saved = await saveWord(childId, {
        word,
        contextSentence: sentence,
        source: 'CHILD',
      });
      markWordSaved(childId, word);
      setStates((prev) => ({ ...prev, [word]: 'saved' }));
      setNotice(`"${saved.word}" 담았어요!`);
      /*
       * 단어장을 바로 열어도 비어 있지 않게 응답을 캐시에 먼저 꽂는다.
       * 목록 쿼리가 아직 한 번도 안 돌았으면(undefined) 건드리지 않는다 —
       * 반쪽짜리 목록을 "성공" 으로 만들어 두면 totalCount 가 어긋난다
       */
      queryClient.setQueryData<WordList>(wordsKey(childId), (prev) =>
        prev ? mergeWord(prev, saved) : prev,
      );
    } catch (error) {
      const outcome = wordSaveOutcome(error);
      if (outcome === 'duplicate') markWordSaved(childId, word);
      setStates((prev) => ({ ...prev, [word]: outcome }));
      setNotice(wordSaveMessage(error));
    } finally {
      // wordStats 도 함께 낡는다 — 마이페이지가 낡은 값을 보여주지 않게 둘 다 무효화한다
      void queryClient.invalidateQueries({ queryKey: wordsKey(childId) });
      void queryClient.invalidateQueries({ queryKey: growthKey(childId) });
    }
  }

  if (childId === null || !picking) {
    return (
      <>
        {/* 모드가 꺼져 있으면 마크업이 예전과 완전히 같아야 한다 (기존 화면·테스트가 이 글을 읽는다) */}
        <p className="pt-2 text-body whitespace-pre-line text-ink">{text}</p>
        <ActionRow>
          {childId !== null && <CatchToggle picking={false} onClick={() => setPicking(true)} />}
          {footer}
        </ActionRow>
      </>
    );
  }

  return (
    <>
      <div className="pt-2 text-body text-ink">
        {splitLines(text).map((sentences, lineIndex) => (
          <p key={lineIndex} className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
            {sentences.map((sentence) =>
              // 문장 → 단어 순서로 그리면 contextSentence 가 여기서 그대로 나온다.
              // 나중에 되짚어 찾으면 같은 단어가 두 문장에 있을 때 틀린 문장을 보낸다
              splitTokens(sentence).map((token, tokenIndex) => {
                const state = states[token.clean];
                const done = state === 'saved' || state === 'duplicate' || alreadySaved.has(token.clean);
                return (
                  <button
                    key={`${sentence}-${tokenIndex}`}
                    type="button"
                    onClick={() => pick(token.clean, sentence)}
                    aria-label={`${token.clean} 담기`}
                    className={cn(
                      'rounded-[6px] px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
                      state === 'saving' && 'bg-line text-ink-soft',
                      done && 'bg-ink font-semibold text-cta-ink',
                      state === 'error' && 'bg-danger/10 text-danger',
                      !state && !done && 'bg-surface-raised text-ink',
                    )}
                  >
                    {token.raw}
                  </button>
                );
              }),
            )}
          </p>
        ))}
      </div>

      <p className="pt-2 text-caption text-ink-soft" aria-live="polite">
        {notice || '모르는 단어를 눌러 봐.'}
      </p>
      <ActionRow>
        <CatchToggle picking onClick={() => setPicking(false)} />
        {footer}
      </ActionRow>
    </>
  );
}

/** 낭독 패널 아래 보조 버튼 줄 — 담기 토글과 "다시 듣기" 가 붙어 보이지 않게 한다 */
function ActionRow({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex flex-wrap items-center gap-x-4">{children}</div>;
}

function CatchToggle({ picking, onClick }: { picking: boolean; onClick: () => void }) {
  return (
    <TouchTarget
      size="sm"
      look="ghost"
      aria-pressed={picking}
      onClick={onClick}
      className="text-ink-soft"
    >
      <Icon name="bookmark" className={cn('size-4', picking && 'fill-ink text-ink')} />
      {picking ? '그만 담기' : '단어 담기'}
    </TouchTarget>
  );
}

/** 새로 담은 단어를 목록 맨 앞에 끼워 넣는다 (목록은 최근 저장 순) */
function mergeWord(list: WordList, saved: WordInfo): WordList {
  if (list.words.some((w) => w.wordId === saved.wordId)) return list;
  return {
    totalCount: list.totalCount + 1,
    favoriteCount: list.favoriteCount,
    words: [saved, ...list.words],
  };
}
