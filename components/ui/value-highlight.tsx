import React from 'react';

import { cn } from './utils';

interface ValueHighlightProps {
  children: React.ReactNode;
  isPlaceholder?: boolean;
  className?: string;
}

export function ValueHighlight({
  children,
  isPlaceholder = false,
  className,
}: ValueHighlightProps) {
  return (
    <span
      className={cn(
        'px-2 py-1 rounded font-medium',
        isPlaceholder
          ? 'border-2 border-red-500 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-100 dark:border-red-600'
          : 'border border-green-500 bg-green-50 text-green-900 dark:bg-green-950/20 dark:text-green-100 dark:border-green-600',
        className
      )}
    >
      {children}
    </span>
  );
}
