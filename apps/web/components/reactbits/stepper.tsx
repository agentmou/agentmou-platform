'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

interface StepConfig {
  id: number
  name: string
  icon: React.ElementType
}

interface StepperProps {
  steps: StepConfig[]
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn('flex w-full items-center', className)}>
      {steps.map((step, index) => {
        const StepIcon = step.icon
        const isActive = step.id === currentStep
        const isComplete = step.id < currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                'group relative flex flex-col items-center gap-1.5 outline-none',
                !isActive && !isComplete && 'cursor-default',
              )}
            >
              <motion.div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                  isActive && 'border-accent bg-accent text-accent-foreground',
                  isComplete && 'border-accent bg-accent/10 text-accent',
                  !isActive && !isComplete && 'border-muted bg-muted text-muted-foreground',
                )}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </motion.div>
              <span
                className={cn(
                  'hidden text-[10px] uppercase tracking-wide sm:block',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.name}
              </span>
            </button>

            {!isLast && (
              <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: isComplete ? '100%' : '0%' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
