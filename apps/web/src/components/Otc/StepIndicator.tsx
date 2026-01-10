'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

/**
 * 步骤指示器组件
 * 用于多步骤流程的进度展示
 */
export const StepIndicator = memo(function StepIndicator({
  steps,
  currentStep,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* 步骤圆圈 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isActive && 'border-primary bg-primary/10 text-primary',
                  !isCompleted && !isActive && 'border-muted-foreground/30 bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.id}
              </div>
              {/* 步骤标签 */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive && 'text-primary',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* 连接线 */}
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-12 md:w-20 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default StepIndicator;
