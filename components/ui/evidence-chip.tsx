import { ExternalLink } from 'lucide-react';

interface EvidenceChipProps {
  docType: 'estimate' | 'roof_report' | 'report';
  page: number | null;
  label?: string;
  textMatch?: string;
  onClick?: () => void;
}

export function EvidenceChip({
  docType,
  page,
  label,
  textMatch: _textMatch,
  onClick,
}: EvidenceChipProps) {
  if (!page) {
    return <span className='text-xs text-gray-400'>---</span>;
  }

  const getDocLabel = () => {
    if (label) return label;
    switch (docType) {
      case 'estimate':
        return 'Estimate';
      case 'roof_report':
        return 'Roof Report';
      case 'report':
        return 'Report';
      default:
        return 'Document';
    }
  };

  return (
    <button
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors cursor-pointer'
      type='button'
    >
      <ExternalLink className='h-3 w-3' />
      {getDocLabel()} p.{page}
    </button>
  );
}
