import { Badge } from './badge';

export type RuleStatus = 'compliant' | 'partial' | 'needs-supplement';

interface RuleStatusBadgeProps {
  status: RuleStatus;
  className?: string;
}

export function RuleStatusBadge({
  status,
  className = '',
}: RuleStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'compliant':
        return {
          label: 'Compliant',
          className:
            'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400',
        };
      case 'partial':
        return {
          label: 'Partial',
          className:
            'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300',
        };
      case 'needs-supplement':
        return {
          label: 'Needs Supplement',
          className:
            'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400',
        };
      default:
        return {
          label: 'Unknown',
          className:
            'bg-zinc-100 text-zinc-800 hover:bg-zinc-100 dark:bg-zinc-900/20 dark:text-zinc-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={`${config.className} ${className}`}>{config.label}</Badge>
  );
}
