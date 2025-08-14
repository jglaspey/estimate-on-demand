import { Skeleton } from '@/components/ui/skeleton';
import type { FieldWithCoordinates } from '@/lib/types/document-extraction';

interface ProgressiveFieldProps {
  field?: FieldWithCoordinates;
  skeletonWidth?: string;
  skeletonHeight?: string;
  className?: string;
  label?: string;
}

export function ProgressiveField({ 
  field, 
  skeletonWidth = 'w-24', 
  skeletonHeight = 'h-4',
  className = '',
  label 
}: ProgressiveFieldProps) {
  if (field?.value) {
    return (
      <span className={`font-medium text-zinc-900 dark:text-zinc-100 ${className}`}>
        {field.value}
        {field.confidence && field.confidence < 0.9 && (
          <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
            ({Math.round(field.confidence * 100)}%)
          </span>
        )}
      </span>
    );
  }

  return <Skeleton className={`${skeletonHeight} ${skeletonWidth} ${className}`} />;
}

interface ProgressiveHeaderProps {
  customerName?: FieldWithCoordinates;
  propertyAddress?: FieldWithCoordinates;
}

export function ProgressiveHeader({ customerName, propertyAddress }: ProgressiveHeaderProps) {
  return (
    <div>
      {customerName?.value ? (
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {customerName.value}
          {customerName.confidence && customerName.confidence < 0.9 && (
            <span className="ml-2 text-sm text-amber-600 dark:text-amber-400">
              ({Math.round(customerName.confidence * 100)}% confidence)
            </span>
          )}
        </h1>
      ) : (
        <Skeleton className="h-9 w-64 mb-2" />
      )}
      
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <MapPin className="h-4 w-4 opacity-50" />
        {propertyAddress?.value ? (
          <span>
            {propertyAddress.value}
            {propertyAddress.confidence && propertyAddress.confidence < 0.9 && (
              <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                ({Math.round(propertyAddress.confidence * 100)}%)
              </span>
            )}
          </span>
        ) : (
          <Skeleton className="h-4 w-80" />
        )}
      </div>
    </div>
  );
}

// Import MapPin icon
import { MapPin } from 'lucide-react';