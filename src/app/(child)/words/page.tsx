'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/features/auth/use-session';
import { AppHeader } from '@/features/child-profile/app-header';
import { useSelectedChild } from '@/features/child-profile/use-selected-child';
import { getWords } from '@/features/wordbook/api';
import { Icon, Screen, Stack, TabBar, TouchTarget } from '@/shared/ui';

/**
 * 단어장.
 *
 * 디자이너 주석: "실제로 기능이 작동하지는 않지만, 하단 바 눌렀을때 나오는 디자인".
 * 다만 배포본에 `GET /children/{id}/words` 가 이미 있어 그대로 붙였다 —
 * 없거나 실패하면 api 계층이 빈 목록으로 떨어뜨려 시안의 빈 상태가 그대로 나온다.
 */
export default function WordsPage() {
  const authenticated = useRequireAuth();
  const child = useSelectedChild(authenticated);

  const words = useQuery({
    queryKey: ['words', child.selected?.childId],
    queryFn: () => getWords(child.selected!.childId),
    enabled: authenticated && child.selected !== undefined,
  });

  if (!authenticated) {
    return (
      <Screen className="items-center justify-center">
        <p className="text-body text-ink-soft">불러오는 중…</p>
      </Screen>
    );
  }

  const list = words.data?.words ?? [];

  return (
    <Screen scrollable className="py-6" data-testid="wordbook">
      <Stack gap="lg" className="mx-auto w-full max-w-5xl">
        <AppHeader
          title="단어장"
          list={child.list}
          selected={child.selected}
          onSelect={child.select}
        />

        {list.length === 0 ? (
          <Stack gap="lg" align="center" className="py-16">
            <div
              aria-hidden
              className="flex h-40 w-52 flex-col items-center justify-center gap-3 rounded-control border border-dashed border-line-strong bg-surface-raised text-ink-faint"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-white">
                <Icon name="close" className="size-6" />
              </span>
              <span className="text-caption">Vocabulary Empty Illustration</span>
            </div>
            <Stack gap="sm" align="center">
              <p className="text-display font-extrabold text-ink">아직 모은 단어가 없어요!</p>
              <p className="text-bubble text-ink-soft">
                이야기를 하다 만난 단어를 여기에서 다시 볼 수 있어요.
              </p>
            </Stack>
            <Link href="/stories">
              <TouchTarget size="lg">이야기 보러 가기</TouchTarget>
            </Link>
          </Stack>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((word) => (
              <li
                key={word.wordId}
                className="flex items-start gap-3 rounded-card border border-line bg-white px-4 py-3"
              >
                <Icon name="bookmark" className="mt-1 size-5 text-ink-soft" />
                <Stack gap="sm">
                  <p className="text-body font-semibold text-ink">{word.word}</p>
                  {word.contextSentence && (
                    <p className="text-caption text-ink-soft">{word.contextSentence}</p>
                  )}
                </Stack>
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <TabBar />
    </Screen>
  );
}
