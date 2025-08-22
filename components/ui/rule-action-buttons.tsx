import { Button } from './button';

interface RuleActionButtonsProps {
  onReject: () => void;
  onApprove: () => void;
  rejectLabel?: string;
  approveLabel?: string;
  disabled?: boolean;
}

export function RuleActionButtons({
  onReject,
  onApprove,
  rejectLabel = 'Reject',
  approveLabel = 'Approve and continue',
  disabled = false,
}: RuleActionButtonsProps) {
  return (
    <div className='flex items-center justify-between pt-4'>
      <button
        onClick={onReject}
        disabled={disabled}
        className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        type='button'
      >
        {rejectLabel}
      </button>
      <Button
        onClick={onApprove}
        disabled={disabled}
        className='bg-blue-600 hover:bg-blue-700 text-white'
      >
        {approveLabel}
      </Button>
    </div>
  );
}
