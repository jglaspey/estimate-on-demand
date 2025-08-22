import { cn } from './utils';

interface SkeletonFieldProps {
  value: string | number | null | undefined;
  loading?: boolean;
  className?: string;
  width?: string;
  height?: string;
  placeholder?: string;
}

/**
 * Display a skeleton loader when value is not available, otherwise show the value
 * Never shows $0, empty strings, or placeholder values while loading
 */
export function SkeletonField({
  value,
  loading = false,
  className,
  width = 'w-20',
  height = 'h-5',
  placeholder = '---',
}: SkeletonFieldProps) {
  // Check if value is actually loaded
  const isLoading =
    loading ||
    value === undefined ||
    value === null ||
    value === '' ||
    value === 0 ||
    value === '0' ||
    value === '$0' ||
    value === '1900-01-01'; // Placeholder date for loading state

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded',
          width,
          height,
          className
        )}
      />
    );
  }

  // Format the value
  let displayValue: string | number = value ?? placeholder;
  if (typeof value === 'number') {
    const factor = Math.pow(10, 2);
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    displayValue = rounded.toFixed(2);
  }

  return <span className={className}>{displayValue}</span>;
}

/**
 * Currency field with skeleton loader
 */
export function SkeletonCurrency({
  value,
  loading = false,
  className,
  width = 'w-24',
}: Omit<SkeletonFieldProps, 'placeholder'>) {
  const isLoading =
    loading ||
    value === undefined ||
    value === null ||
    value === 0 ||
    value === '0';

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded h-5',
          width,
          className
        )}
      />
    );
  }

  let displayValue: string | number = value ?? '---';
  if (typeof value === 'number') {
    const factor = Math.pow(10, 2);
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    displayValue = `$${rounded.toFixed(2)}`;
  }

  return <span className={className}>{displayValue}</span>;
}
