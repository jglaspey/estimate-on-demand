import { Copy } from 'lucide-react';
import { useState } from 'react';

import { Textarea } from './textarea';

interface SupplementNoteProps {
  value: string;
  onChange: (value: string) => void;
  dynamicNote?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function SupplementNote({
  value,
  onChange,
  dynamicNote,
  placeholder = 'Add any custom notes for this supplement...',
  readOnly = false,
}: SupplementNoteProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || dynamicNote || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
          Supplement note:
        </label>
        <button
          onClick={handleCopy}
          className='inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors'
          type='button'
        >
          <Copy className='h-3 w-3' />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={dynamicNote || placeholder}
        readOnly={readOnly}
        className='min-h-[80px] text-sm border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 resize-none'
      />
    </div>
  );
}
