/**
 * Rule Configuration System
 *
 * Flexible mapping system for business rules using slugs instead of numbers.
 * This allows rules to be reordered, added, or modified without breaking URLs.
 */

export interface RuleDefinition {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  category: 'coverage' | 'compliance' | 'quality';
  component: string; // Component name to render
  analysisKey: string; // Key in analysis results
  isAvailable: boolean; // Whether the rule is implemented
  priority: number; // Display order (1 = highest priority)
  autoScroll?: {
    enabled: boolean; // Whether to auto-scroll to evidence
    priority: 'estimate' | 'roof_report' | 'any'; // Which evidence to prioritize
    delay?: number; // Delay in ms before scrolling (default: 200)
  };
}

// Master rule configuration
export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    slug: 'hip-ridge-cap',
    name: 'Hip & Ridge Cap Analysis',
    shortName: 'Ridge Cap',
    description:
      'Ridge cap material quality and coverage analysis for ASTM compliance',
    category: 'compliance',
    component: 'RidgeCapAnalysis',
    analysisKey: 'ridgeCap',
    isAvailable: true,
    priority: 1,
    autoScroll: {
      enabled: true,
      priority: 'estimate', // Prioritize estimate evidence for supplement writers
      delay: 200,
    },
  },
  {
    slug: 'drip-edge-gutter-apron',
    name: 'Drip Edge & Gutter Apron',
    shortName: 'Edge Protection',
    description:
      'Edge protection analysis for rakes and eaves water management',
    category: 'coverage',
    component: 'DripEdgeGutterApronCard',
    analysisKey: 'dripEdge',
    isAvailable: true,
    priority: 2,
  },
  {
    slug: 'starter-strip',
    name: 'Starter Strip Coverage',
    shortName: 'Starter Strip',
    description: 'Universal starter course analysis and coverage calculation',
    category: 'coverage',
    component: 'StarterStripCard',
    analysisKey: 'starterStrip',
    isAvailable: false, // Not yet implemented
    priority: 3,
  },
  {
    slug: 'ice-water-barrier',
    name: 'Ice & Water Barrier',
    shortName: 'Ice & Water',
    description: 'Code-compliant ice and water barrier coverage calculation',
    category: 'coverage',
    component: 'IceWaterBarrierCard',
    analysisKey: 'iceWaterBarrier',
    isAvailable: true, // Now implemented
    priority: 4,
  },
];

// Helper functions for rule management
export const getRuleBySlug = (slug: string): RuleDefinition | undefined => {
  return RULE_DEFINITIONS.find(rule => rule.slug === slug);
};

export const getAvailableRules = (): RuleDefinition[] => {
  return RULE_DEFINITIONS.filter(rule => rule.isAvailable).sort(
    (a, b) => a.priority - b.priority
  );
};

export const getAllRules = (): RuleDefinition[] => {
  return RULE_DEFINITIONS.sort((a, b) => a.priority - b.priority);
};

export const getNextRule = (
  currentSlug: string
): RuleDefinition | undefined => {
  const availableRules = getAvailableRules();
  const currentIndex = availableRules.findIndex(
    rule => rule.slug === currentSlug
  );
  if (currentIndex >= 0 && currentIndex < availableRules.length - 1) {
    return availableRules[currentIndex + 1];
  }
  return undefined;
};

export const getPreviousRule = (
  currentSlug: string
): RuleDefinition | undefined => {
  const availableRules = getAvailableRules();
  const currentIndex = availableRules.findIndex(
    rule => rule.slug === currentSlug
  );
  if (currentIndex > 0) {
    return availableRules[currentIndex - 1];
  }
  return undefined;
};

export const getRuleProgress = (
  currentSlug: string
): { current: number; total: number } => {
  const availableRules = getAvailableRules();
  const currentIndex = availableRules.findIndex(
    rule => rule.slug === currentSlug
  );
  return {
    current: currentIndex + 1,
    total: availableRules.length,
  };
};
