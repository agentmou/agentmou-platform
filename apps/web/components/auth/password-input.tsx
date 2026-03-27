'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EyeIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn('size-3.5', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn('size-3.5', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  score = Math.min(score, 4);

  const strengths: PasswordStrength[] = [
    {
      score: 0,
      label: 'Very weak',
      color: 'text-destructive',
      bgColor: 'bg-destructive',
    },
    {
      score: 1,
      label: 'Weak',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
    },
    {
      score: 2,
      label: 'Fair',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
    },
    {
      score: 3,
      label: 'Good',
      color: 'text-lime-500',
      bgColor: 'bg-lime-500',
    },
    {
      score: 4,
      label: 'Strong',
      color: 'text-green-500',
      bgColor: 'bg-green-500',
    },
  ];

  return strengths[score];
}

interface PasswordRequirement {
  label: string;
  validator: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', validator: (p) => p.length >= 8 },
  { label: 'One uppercase letter', validator: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', validator: (p) => /[a-z]/.test(p) },
  { label: 'One number', validator: (p) => /\d/.test(p) },
  { label: 'One special character', validator: (p) => /[^a-zA-Z0-9]/.test(p) },
];

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  error?: string;
  'aria-describedby'?: string;
}

export function PasswordInput({
  className,
  showStrengthIndicator = false,
  showRequirements = false,
  error,
  id,
  value,
  onChange,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState('');

  const password = value !== undefined ? String(value) : internalValue;
  const strength = calculatePasswordStrength(password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const errorId = error ? `${id}-error` : undefined;
  const strengthId = showStrengthIndicator ? `${id}-strength` : undefined;
  const requirementsId = showRequirements ? `${id}-requirements` : undefined;

  const describedBy =
    [props['aria-describedby'], errorId, strengthId, requirementsId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          className={cn(
            'pr-10',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {showStrengthIndicator && password.length > 0 && (
        <div id={strengthId} className="space-y-2" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  index <= strength.score ? strength.bgColor : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className={cn('text-xs font-medium transition-colors', strength.color)}>
            Strength: {strength.label}
          </p>
        </div>
      )}

      {showRequirements && password.length > 0 && (
        <ul
          id={requirementsId}
          className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs"
          aria-label="Password requirements"
        >
          {passwordRequirements.map((req) => {
            const isValid = req.validator(password);
            return (
              <li
                key={req.label}
                className={cn(
                  'flex items-center gap-1.5 transition-colors duration-200',
                  isValid ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {isValid ? (
                  <CheckIcon className="text-green-600 shrink-0" />
                ) : (
                  <XIcon className="text-muted-foreground/50 shrink-0" />
                )}
                <span>{req.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** @internal Exported for unit tests */
export function passwordStrengthLabel(password: string): string {
  return calculatePasswordStrength(password).label;
}
