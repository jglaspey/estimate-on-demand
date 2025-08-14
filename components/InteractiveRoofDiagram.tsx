import { useState } from 'react';
import {
  Eye,
  Home,
  ExternalLink,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface RoofSection {
  type: 'ridge' | 'hip' | 'eave' | 'rake' | 'valley';
  value: number;
  unit: string;
  label: string;
  color: string;
}

interface EvidenceItem {
  id: string;
  source: 'estimate' | 'report';
  description: string;
  page: number;
  line?: string;
  value: string;
  link?: string;
}

interface InteractiveRoofDiagramProps {
  selectedRule: string | null;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function InteractiveRoofDiagram({
  selectedRule,
  currentPage = 1,
  onPageChange,
}: InteractiveRoofDiagramProps) {
  const [activeDocTab, setActiveDocTab] = useState<'estimate' | 'report'>(
    'estimate'
  );

  // Get roof measurements based on selected rule
  const getRoofSections = (): RoofSection[] => {
    if (selectedRule === 'ridge_cap') {
      return [
        {
          type: 'ridge',
          value: 26,
          unit: 'LF',
          label: 'Ridge',
          color: 'text-blue-600',
        },
        {
          type: 'hip',
          value: 93,
          unit: 'LF',
          label: 'Hip',
          color: 'text-emerald-600',
        },
      ];
    } else if (
      selectedRule === 'starter_strip' ||
      selectedRule === 'drip_edge'
    ) {
      return [
        {
          type: 'eave',
          value: 180,
          unit: 'LF',
          label: 'Eaves',
          color: 'text-amber-600',
        },
        {
          type: 'rake',
          value: 120,
          unit: 'LF',
          label: 'Rakes',
          color: 'text-purple-600',
        },
      ];
    }
    return [];
  };

  // Get evidence items based on selected rule
  const getEvidenceItems = (): EvidenceItem[] => {
    if (selectedRule === 'ridge_cap') {
      return [
        {
          id: '1',
          source: 'estimate',
          description: 'Estimate ridge cap',
          page: 4,
          line: 'Line 3b',
          value: '6 LF',
          link: 'Estimate p.4',
        },
        {
          id: '2',
          source: 'report',
          description: 'Ridges',
          page: 2,
          line: 'Section 3',
          value: '26 LF',
          link: 'Report p.2',
        },
        {
          id: '3',
          source: 'report',
          description: 'Hips',
          page: 2,
          line: 'Section 3',
          value: '93 LF',
          link: 'Report p.2',
        },
      ];
    } else if (selectedRule === 'starter_strip') {
      return [
        {
          id: '1',
          source: 'estimate',
          description: 'Starter strip option',
          page: 4,
          line: 'Options',
          value: 'Included in waste',
          link: 'Estimate p.4',
        },
        {
          id: '2',
          source: 'report',
          description: 'Total Eaves',
          page: 2,
          line: 'Measurements',
          value: '180 LF',
          link: 'Report p.2',
        },
      ];
    }
    return [];
  };

  const sections = getRoofSections();
  const evidenceItems = getEvidenceItems();

  // Calculate total required coverage
  const totalRequired = sections.reduce(
    (sum, section) => sum + section.value,
    0
  );

  return (
    <div className='space-y-4'>
      {/* Document Evidence Header */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
              <Eye className='h-4 w-4 text-blue-600 dark:text-blue-400' />
            </div>
            <div className='flex-1'>
              <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                Document Evidence
              </h3>
              <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                {selectedRule
                  ? `${selectedRule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} analysis • Interactive evidence viewer`
                  : 'Select a rule to view evidence'}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Interactive Roof Diagram */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Home className='h-4 w-4 text-zinc-600 dark:text-zinc-400' />
              <h4 className='text-sm font-medium'>Interactive Roof Diagram</h4>
            </div>
            <span className='text-xs text-zinc-500 dark:text-zinc-400'>
              Click segments to view measurements
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simple roof diagram visualization */}
          <div className='relative w-full h-64 flex items-center justify-center'>
            <svg viewBox='0 0 400 200' className='w-full h-full'>
              {/* Roof outline */}
              <polygon
                points='200,50 350,150 50,150'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='text-zinc-300 dark:text-zinc-600'
              />

              {/* Ridge line */}
              {selectedRule === 'ridge_cap' && (
                <>
                  <line
                    x1='200'
                    y1='50'
                    x2='200'
                    y2='90'
                    stroke='currentColor'
                    strokeWidth='3'
                    className='text-blue-600 cursor-pointer hover:text-blue-700'
                    onClick={() => {}}
                  />
                  <text
                    x='200'
                    y='40'
                    textAnchor='middle'
                    className='text-sm font-medium fill-blue-600'
                  >
                    Ridge: 26 LF
                  </text>

                  {/* Hip lines */}
                  <line
                    x1='200'
                    y1='50'
                    x2='125'
                    y2='100'
                    stroke='currentColor'
                    strokeWidth='3'
                    className='text-emerald-600 cursor-pointer hover:text-emerald-700'
                    onClick={() => {}}
                  />
                  <text
                    x='145'
                    y='70'
                    textAnchor='middle'
                    className='text-sm font-medium fill-emerald-600'
                  >
                    Hip: 93 LF
                  </text>

                  <line
                    x1='200'
                    y1='50'
                    x2='275'
                    y2='100'
                    stroke='currentColor'
                    strokeWidth='3'
                    className='text-emerald-600 cursor-pointer hover:text-emerald-700'
                    onClick={() => {}}
                  />
                  <text
                    x='255'
                    y='70'
                    textAnchor='middle'
                    className='text-sm font-medium fill-emerald-600'
                  >
                    Hip
                  </text>
                </>
              )}

              {/* Eave lines */}
              {(selectedRule === 'starter_strip' ||
                selectedRule === 'drip_edge') && (
                <>
                  <line
                    x1='50'
                    y1='150'
                    x2='350'
                    y2='150'
                    stroke='currentColor'
                    strokeWidth='3'
                    className='text-amber-600 cursor-pointer hover:text-amber-700'
                    onClick={() => {}}
                  />
                  <text
                    x='200'
                    y='165'
                    textAnchor='middle'
                    className='text-sm font-medium fill-amber-600'
                  >
                    Eaves: 180 LF
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Total Required Coverage */}
          <div className='mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-medium text-red-900 dark:text-red-100'>
                  Total Required Coverage:
                </div>
                <div className='text-xs text-red-700 dark:text-red-300'>
                  {sections.map((s, i) => (
                    <span key={s.type}>
                      {s.label} ({s.value} {s.unit})
                      {i < sections.length - 1 ? ' + ' : ''}
                    </span>
                  ))}
                  {' = '}
                  <span className='font-semibold'>
                    {totalRequired} LF total
                  </span>
                </div>
              </div>
              <div className='text-right'>
                <div className='text-lg font-bold text-red-900 dark:text-red-100'>
                  {totalRequired} LF
                </div>
                <button className='text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1'>
                  <ExternalLink className='h-3 w-3' />
                  View source
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Stack */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Eye className='h-4 w-4 text-zinc-600 dark:text-zinc-400' />
              <h4 className='text-sm font-medium'>Evidence Stack</h4>
              <Badge variant='secondary' className='text-xs'>
                {evidenceItems.length} items
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          {evidenceItems.map(item => (
            <div
              key={item.id}
              className='flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors'
            >
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium text-sm'>
                    {item.description}
                  </span>
                  <span className='text-xs text-zinc-500'>
                    Page {item.page}, {item.line}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='font-mono font-semibold text-sm'>
                  {item.value}
                </span>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1'>
                  <ExternalLink className='h-3 w-3' />
                  {item.link}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Document Tabs */}
      <Card>
        <CardContent className='p-0'>
          <div className='border-b'>
            <div className='flex'>
              <button
                onClick={() => setActiveDocTab('estimate')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                  activeDocTab === 'estimate'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Receipt className='h-4 w-4' />
                Insurance Estimate
              </button>
              <button
                onClick={() => setActiveDocTab('report')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                  activeDocTab === 'report'
                    ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Home className='h-4 w-4' />
                EagleView Report
              </button>
            </div>
          </div>

          {/* Document controls */}
          <div className='flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50'>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='h-7 px-2'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                Page {currentPage} of 6
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange?.(Math.min(6, currentPage + 1))}
                disabled={currentPage === 6}
                className='h-7 px-2'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>

            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' className='h-7 px-2'>
                <ZoomOut className='h-3.5 w-3.5' />
              </Button>
              <span className='text-xs text-zinc-600 dark:text-zinc-400'>
                100%
              </span>
              <Button variant='outline' size='sm' className='h-7 px-2'>
                <ZoomIn className='h-3.5 w-3.5' />
              </Button>
              <Button variant='outline' size='sm' className='h-7 px-2'>
                <Download className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>

          {/* Document preview area */}
          <div className='h-96 bg-white dark:bg-zinc-900 flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2'>
                {activeDocTab === 'estimate'
                  ? 'ALLSTATE INSURANCE ESTIMATE'
                  : 'EAGLEVIEW ROOF REPORT'}
              </div>
              <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                Page {currentPage} of 6
              </p>
              {activeDocTab === 'estimate' && (
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
                  Claim #0760901231 • John Smith
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
