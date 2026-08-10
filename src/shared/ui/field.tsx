'use client';

import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/shared/ui/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// 라벨·입력·오류를 한 묶음으로 다루는 폼 필드. 시안 도착 전 회색 박스 스타일
export function Field({ label, error, hint, className, id, ...rest }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'min-h-touch rounded-card border-2 bg-surface px-4 text-body text-ink',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-soft',
          error ? 'border-ink' : 'border-line',
          className,
        )}
        {...rest}
      />
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
