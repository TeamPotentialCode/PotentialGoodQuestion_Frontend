'use client';

import type { InputHTMLAttributes } from 'react';
import { useId, useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { Icon } from '@/shared/ui/icon';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// 라벨·입력·오류를 한 묶음으로 다루는 폼 필드
export function Field({ label, error, hint, className, id, type, ...rest }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // 비밀번호는 눈 아이콘으로 잠깐 보여줄 수 있다(시안). 오타로 로그인이 막히는 걸 줄인다
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body font-medium text-ink">
        {label}
      </label>
      <div className="relative flex">
        <input
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'min-h-touch w-full rounded-card border-2 bg-surface px-4 text-body text-ink',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
            isPassword && 'pr-touch',
            error ? 'border-ink' : 'border-line',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-pressed={revealed}
            className={cn(
              'absolute inset-y-0 right-0 flex w-touch items-center justify-center text-ink-soft',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
            )}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} />
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-caption font-medium text-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
