/**
 * Rule Navigation Button Component
 *
 * Provides consistent navigation links from rule cards to individual rule pages
 */

import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface RuleNavigationButtonProps {
  jobId: string;
  ruleSlug: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

// Map legacy rule names to slugs for backward compatibility
const RULE_NAME_TO_SLUG_MAP: Record<string, string> = {
  ridge_cap: 'hip-ridge-cap',
  drip_edge: 'drip-edge-gutter-apron',
  starter_strip: 'starter-strip',
  ice_water_barrier: 'ice-water-barrier',
};

export function RuleNavigationButton({
  jobId,
  ruleSlug,
  label = 'View Details',
  variant = 'outline',
  size = 'sm',
}: RuleNavigationButtonProps) {
  const router = useRouter();

  // Handle legacy rule names
  const actualSlug = RULE_NAME_TO_SLUG_MAP[ruleSlug] || ruleSlug;

  const handleNavigation = () => {
    router.push(`/job/${jobId}/${actualSlug}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleNavigation}
      className='gap-2'
    >
      {label}
      <ExternalLink className='h-3.5 w-3.5' />
    </Button>
  );
}
