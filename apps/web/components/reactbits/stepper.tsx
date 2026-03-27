'use client';

import { useState, Children, useRef, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Step – thin wrapper around each step's content                     */
/* ------------------------------------------------------------------ */

interface StepProps {
  children: ReactNode;
}

export function Step({ children }: StepProps) {
  return <div className="px-6 sm:px-8">{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  Stepper – full container (card, indicators, animated content,      */
/*           back / continue footer)                                   */
/* ------------------------------------------------------------------ */

interface StepLabel {
  id: number;
  name: string;
}

interface StepperProps {
  children: ReactNode;
  /** Labels for the indicator circles (must match children count) */
  steps: StepLabel[];
  /** Controlled current step (1-based) */
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Fires when the user clicks "Complete" on the last step */
  onComplete?: () => void;
  /** Whether the Next/Complete button should be enabled */
  canProceed?: boolean;
  /** Show a loading state on the action button */
  isLoading?: boolean;
  /** Allow clicking completed step indicators to jump back */
  disableStepIndicators?: boolean;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  className?: string;
}

export function Stepper({
  children,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  canProceed = true,
  isLoading = false,
  disableStepIndicators = false,
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  completeButtonText = 'Complete',
  className,
}: StepperProps) {
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isLastStep = currentStep === totalSteps;

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setDirection(1);
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLastStep, onStepChange, onComplete]);

  const handleIndicatorClick = useCallback(
    (step: number) => {
      if (disableStepIndicators) return;
      if (step === currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      onStepChange(step);
    },
    [currentStep, disableStepIndicators, onStepChange]
  );

  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-lg">
        {/* Step indicator row */}
        <div className="flex w-full items-center gap-0 p-6 sm:p-8">
          {steps.map((step, index) => {
            const stepNum = step.id;
            const isActive = stepNum === currentStep;
            const isComplete = stepNum < currentStep;
            const isNotLast = index < steps.length - 1;

            return (
              <div key={stepNum} className="contents">
                <StepIndicator
                  step={stepNum}
                  name={step.name}
                  isActive={isActive}
                  isComplete={isComplete}
                  onClick={() => handleIndicatorClick(stepNum)}
                  disabled={disableStepIndicators}
                />
                {isNotLast && <StepConnector isComplete={isComplete} />}
              </div>
            );
          })}
        </div>

        {/* Animated step content */}
        <StepContentWrapper currentStep={currentStep} direction={direction}>
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {/* Footer with Back / Next buttons */}
        <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          <div className={cn('mt-6 flex', currentStep > 1 ? 'justify-between' : 'justify-end')}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {backButtonText}
              </button>
            )}

            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleNext}
              disabled={!canProceed || isLoading}
            >
              {isLoading ? <LoadingSpinner /> : isLastStep ? completeButtonText : nextButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal sub-components                                            */
/* ------------------------------------------------------------------ */

function StepIndicator({
  step,
  name,
  isActive,
  isComplete,
  onClick,
  disabled,
}: {
  step: number;
  name: string;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled && !isComplete}
        className="relative flex h-8 w-8 items-center justify-center rounded-full outline-none"
        animate={{
          backgroundColor: isActive || isComplete ? 'var(--accent)' : 'var(--muted)',
          color: isActive || isComplete ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
        }}
        transition={{ duration: 0.25 }}
      >
        {isComplete ? (
          <CheckIcon />
        ) : isActive ? (
          <motion.div
            className="h-2.5 w-2.5 rounded-full bg-accent-foreground"
            layoutId="active-dot"
          />
        ) : (
          <span className="text-xs font-semibold">{step}</span>
        )}
      </motion.button>
      <span
        className={cn(
          'hidden text-[10px] uppercase tracking-wide sm:block',
          isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        {name}
      </span>
    </div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="relative mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-muted sm:mx-2">
      <motion.div
        className="absolute inset-y-0 left-0 bg-accent"
        initial={false}
        animate={{ width: isComplete ? '100%' : '0%' }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function StepContentWrapper({
  currentStep,
  direction,
  children,
}: {
  currentStep: number;
  direction: number;
  children: ReactNode;
}) {
  const [height, setHeight] = useState<number | 'auto'>('auto');

  return (
    <motion.div
      className="relative overflow-hidden"
      animate={{ height }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <SlideTransition key={currentStep} direction={direction} onHeightReady={setHeight}>
          {children}
        </SlideTransition>
      </AnimatePresence>
    </motion.div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-50%' : '50%',
    opacity: 0,
  }),
};

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: ReactNode;
  direction: number;
  onHeightReady: (h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      onHeightReady(ref.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
