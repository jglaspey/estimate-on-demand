import { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
  Home,
  FileText,
  Image as ImageIcon,
  Highlighter,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface DocumentPage {
  pageNumber: number;
  content: Record<string, unknown>; // JSON content from extraction
  rawText: string | null;
  wordCount: number;
  confidence: number | null;
  dimensions?: {
    width: number | null;
    height: number | null;
  };
  images?: string[]; // normalized /uploads paths if present
}

interface DocumentData {
  id: string;
  fileName: string;
  fileType: 'estimate' | 'roof_report';
  filePath: string | null;
  pageCount: number;
  pages: DocumentPage[];
}

interface EnhancedDocumentViewerProps {
  jobId: string;
  selectedRule: string | null;
  reloadVersion?: number; // bump to re-fetch
  busy?: boolean; // external loading state for skeletons
}

interface DocumentHighlight {
  type: 'line-item' | 'measurement' | 'calculation' | 'note';
  description: string;
  page: number;
  relevance: 'high' | 'medium' | 'low';
  location: string;
  value?: string;
  issue?: boolean;
  textMatch?: string; // For highlighting in extracted text
}

export function EnhancedDocumentViewer({
  jobId,
  selectedRule,
  reloadVersion = 0,
  busy = false,
}: EnhancedDocumentViewerProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pdf' | 'extracted'>('extracted');
  const [_showHighlights] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track which rule we already auto-navigated for, so we don't keep forcing the page/tab
  const [lastAutoRule, setLastAutoRule] = useState<string | null>(null);
  // Ensure we only set initial doc/page once per mount
  const hasInitializedRef = useRef(false);

  // Fetch documents and their extracted content
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/documents`);
        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        setDocuments(data.documents);

        // Do not set active tab here; defer to initializer effect to pick the estimate
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchDocuments();
    }
  }, [jobId, reloadVersion]);
  // Initialize default view: Estimate, Extracted, Page 1
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (documents.length === 0) return;

    const estimateDoc =
      documents.find(d => d.fileType === 'estimate') || documents[0];

    setActiveTab(estimateDoc.id);
    setViewMode('extracted');
    setCurrentPage(1);
    // Prevent immediate auto-jump on first render
    setLastAutoRule(selectedRule);
    hasInitializedRef.current = true;
  }, [documents, selectedRule]);

  // Prefetch PDF assets in the background for instant switching
  useEffect(() => {
    if (documents.length === 0) return;
    const pdfUrls = documents
      .map(d => d.filePath)
      .filter((u): u is string => Boolean(u));

    if (pdfUrls.length === 0) return;

    // Inject <link rel="prefetch"> tags
    const links: HTMLLinkElement[] = [];
    pdfUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    });

    const idle = (cb: () => void) =>
      (window as Window & { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback
        ? (
            window as Window & { requestIdleCallback: (cb: () => void) => void }
          ).requestIdleCallback(cb)
        : setTimeout(cb, 150);

    const abortControllers: AbortController[] = [];
    idle(() => {
      pdfUrls.forEach(url => {
        const ac = new AbortController();
        abortControllers.push(ac);
        // Warm HTTP cache; errors are non-fatal
        fetch(url, { cache: 'force-cache', signal: ac.signal }).catch(() => {});
      });
    });

    return () => {
      links.forEach(l => l.remove());
      abortControllers.forEach(ac => ac.abort());
    };
  }, [documents]);

  // Reset page when switching tabs
  useEffect(() => {
    // When tab changes, clamp the page to the new document's range
    const doc = documents.find(d => d.id === activeTab);
    if (!doc) {
      setCurrentPage(1);
      return;
    }
    setCurrentPage(prev => Math.min(Math.max(1, prev), doc.pageCount || 1));
  }, [activeTab]);

  // Get highlights based on the selected rule
  const getHighlights = (rule: string | null): DocumentHighlight[] => {
    if (!rule) return [];

    const highlightMap: Record<string, DocumentHighlight[]> = {
      ridge_cap: [
        {
          type: 'line-item',
          description: 'Hip/Ridge cap - Standard profile',
          page: 4,
          relevance: 'high',
          location: 'Line 3b',
          value: '6.00 LF @ $42.90 = $257.40',
          issue: true,
          textMatch: 'Hip/Ridge cap.*6\\.00 LF',
        },
        {
          type: 'measurement',
          description: 'Total Ridges/Hips: 119 ft',
          page: 2,
          relevance: 'high',
          location: 'EagleView Report',
          value: 'Ridges: 26 ft, Hips: 93 ft',
          textMatch: 'Ridge.*119|Total.*Ridge.*Hip',
        },
      ],
      starter_strip: [
        {
          type: 'note',
          description: 'Include eave starter course: Yes',
          page: 4,
          relevance: 'high',
          location: 'Options section',
          value: '(included in waste)',
          issue: true,
          textMatch: 'starter course.*included|eave starter',
        },
        {
          type: 'measurement',
          description: 'Total Eaves: 180 LF',
          page: 2,
          relevance: 'high',
          location: 'Roof Report',
          value: 'Requires universal starter strip',
          textMatch: 'Eave.*180|Total Eave',
        },
      ],
      drip_edge: [
        {
          type: 'line-item',
          description: 'Drip edge',
          page: 4,
          relevance: 'high',
          location: 'Line 8',
          value: '120 LF @ $3.50 = $420.00',
          textMatch: 'Drip edge.*120',
        },
        {
          type: 'measurement',
          description: 'Missing: Gutter apron for eaves',
          page: 4,
          relevance: 'high',
          location: 'Missing line item',
          value: '180 LF needed',
          issue: true,
          textMatch: 'Gutter apron|eave.*180',
        },
      ],
      ice_water_barrier: [
        {
          type: 'line-item',
          description: 'Ice & water barrier',
          page: 4,
          relevance: 'high',
          location: 'Line 12',
          value: '800 SF @ $1.85 = $1,480.00',
          issue: true,
          textMatch: 'Ice.*water.*800',
        },
        {
          type: 'calculation',
          description: 'IRC R905.1.2 requirement calculation',
          page: 2,
          relevance: 'high',
          location: 'Cross-reference',
          value: '180 LF × 60.4" ÷ 12 = 1,167 SF required',
          textMatch: 'soffit|overhang|eave.*width',
        },
      ],
    };

    return highlightMap[rule] || [];
  };

  const highlights = getHighlights(selectedRule);

  // Auto-jump once when a rule changes, but never override user tab/page thereafter
  useEffect(() => {
    // Only run once per new rule and only after documents are loaded
    if (!selectedRule || documents.length === 0) return;
    if (lastAutoRule === selectedRule) return;

    if (highlights.length > 0) {
      const firstHighlight = highlights[0];

      // Set page within current tab; if out of range, clamp
      const activeDoc = documents.find(d => d.id === activeTab) || documents[0];
      const targetPage = Math.min(
        Math.max(1, firstHighlight.page),
        activeDoc?.pageCount || firstHighlight.page
      );
      setCurrentPage(targetPage);

      // Only set the tab if none is chosen yet
      if (!activeTab) {
        const fallbackDoc = documents[0];
        setActiveTab((activeDoc || fallbackDoc).id);
      }
    }

    setLastAutoRule(selectedRule);
  }, [selectedRule, documents, highlights, activeTab, lastAutoRule]);

  const getDocumentInfo = (doc: DocumentData) => {
    if (doc.fileType === 'estimate') {
      return {
        shortName: 'Estimate',
        icon: Receipt,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      };
    } else {
      return {
        shortName: 'Roof Report',
        icon: Home,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      };
    }
  };

  // Render extracted text with optional markdown and highlights
  const renderExtractedText = (page: DocumentPage) => {
    // Normalize escape sequences that sometimes arrive as literal characters
    let text = page.rawText || '';
    // Turn literal "\n" into real newlines, and "\t" into spaces
    text = text.replace(/\\n/g, '\n').replace(/\\t/g, '  ');
    // Remove escaped dollars so currency renders cleanly
    text = text.replace(/\\\$/g, '$');

    // Determine highlights for this page up-front
    const _pageHighlights = highlights.filter(h => h.page === page.pageNumber);

    // Check if the text is already properly formatted markdown
    // (has markdown tables, headers, or other markdown formatting)
    const isAlreadyMarkdown =
      /^\|.*\|.*\|$/m.test(text) || // Has markdown tables
      /^#{1,6}\s+/m.test(text) || // Has markdown headers
      /^\s*[-*+]\s+/m.test(text) || // Has markdown lists
      /\[.*?\]\(.*?\)/.test(text); // Has markdown links

    // If it's already markdown, apply minimal processing
    if (isAlreadyMarkdown) {
      // Just clean up excessive whitespace and render
      const cleanedMarkdown = text
        .replace(/\n{4,}/g, '\n\n\n') // Limit to max 3 newlines
        .replace(/^\s+$/gm, '') // Remove whitespace-only lines
        .trim();

      return (
        <div className='prose prose-zinc dark:prose-invert max-w-none text-sm prose-table:text-xs prose-th:font-medium prose-td:p-2'>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              // Custom table rendering for better display
              table: ({ children }) => (
                <div className='overflow-x-auto my-4'>
                  <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className='bg-gray-50 dark:bg-gray-800'>
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'>
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr className='hover:bg-gray-50 dark:hover:bg-gray-800'>
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className='px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className='px-3 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap'>
                  {children}
                </td>
              ),
            }}
          >
            {cleanedMarkdown}
          </ReactMarkdown>
        </div>
      );
    }

    // Otherwise, apply the heuristic formatter pipeline to produce more readable Markdown from raw OCR text
    // 1) Promote probable section headings (ALL CAPS lines, or Title Case lines with no trailing colon) to H2/H3
    // 2) Bold label-value pairs like "Claim Number: 123" → **Claim Number**: 123
    // 3) Convert enumerated items like "3a. Remove Flashing" to bullet list items
    // 4) Preserve existing paragraphs and whitespace sensibly
    const toStructuredMarkdown = (input: string): string => {
      // Pre-pass: normalize separators and synthesize logical breaks
      let pre = input
        // Normalize repeated pipes and add spacing around them to help table detection
        .replace(/\|{2,}/g, '|')
        .replace(/\s*\|\s*/g, ' | ')
        // Promote inline heading markers that appear without newlines
        .replace(/\s##\s+/g, '\n## ')
        .replace(/\s#\s+/g, '\n## ')
        // Numbered or lettered list markers like " 3." or " 3a." → newline before
        .replace(/\s(\d+[a-zA-Z]?)\.(?=\s)/g, '\n$1.')
        // Common section keywords (start new lines)
        .replace(
          /\s(Subtotals|Estimate Total|Estimated Total RC|Loss of Use|Claim Number|Policy Number|Type of Loss|Insurance Company|Date of Loss|Property|Benefits|Taxes|Replacement Cost|Deductible|Overpayment|Summary of this Payment)\b/g,
          '\n$1'
        )
        // Table-ish section starters
        .replace(
          /\s(Description\s+Qty\s+.*?Actual Replacement Cost w\/Tax)\b/g,
          '\n$1'
        )
        // Break before "Source -" blocks seen in reports
        .replace(/\s(Source\s+-\s+EagleView[^\n]*)/g, '\n$1');

      // Insert breaks before any label-like token "Word Word:"
      pre = pre.replace(/([^\n])\s([A-Z][A-Za-z /()&]+:\s)/g, '$1\n$2');

      // If still a single long line, add soft breaks after periods followed by Capital
      if (!/\n/.test(pre)) {
        pre = pre.replace(/\.\s+(?=[A-Z])/g, '.\n');
      }

      const rawLines = pre.split(/\r?\n/);

      const processed: string[] = [];
      let inList = false;

      const isLikelyHeading = (line: string): boolean => {
        const trimmed = line.trim();
        if (trimmed.length < 4) return false;
        // All caps (with symbols/spaces) and at least two words
        const allCaps =
          /^[A-Z0-9 &()\/\-.,']{6,}$/.test(trimmed) && /\s[A-Z]/.test(trimmed);
        // Title-ish case with no trailing colon
        const titleCase =
          /^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){1,}$/.test(trimmed) &&
          !trimmed.endsWith(':');
        // Avoid lines that look like addresses or phone numbers
        const looksLikeContact =
          /(Phone|Fax|Email|E-mail|\d{3}[-). ]?\d{3}[-.]?\d{4})/i.test(trimmed);
        return (allCaps || titleCase) && !looksLikeContact;
      };

      rawLines.forEach((line, _idx) => {
        const l = line.replace(/\s+$/g, ''); // trim right only to keep left alignment

        // Convert label-value pairs to bold labels
        const labelValue = l.replace(
          /(^|\s)([A-Z][A-Za-z ]{2,}?):\s*(.+)$/,
          (_m, leading, label, value) =>
            `${leading}**${label.trim()}**: ${value.trim()}`
        );

        // Detect list items like "1.", "12.", or "3a." at start of line
        const listMatch = labelValue.match(/^\s*(\d+[a-zA-Z]?)\./);
        if (listMatch && labelValue.length > listMatch[0].length + 1) {
          if (!inList) {
            // add a blank line to open a list block if previous content wasn't a list
            if (
              processed.length > 0 &&
              processed[processed.length - 1] !== ''
            ) {
              processed.push('');
            }
            inList = true;
          }
          processed.push(
            `- ${labelValue.replace(/^\s*\d+[a-zA-Z]?\.[\s]*/, '')}`
          );
          return;
        }

        // Close list block when encountering a non-list line
        if (inList) {
          inList = false;
          if (processed.length > 0 && processed[processed.length - 1] !== '') {
            processed.push('');
          }
        }

        // Promote likely headings
        if (isLikelyHeading(labelValue)) {
          // Determine depth: start new sections as H2, sub-sections as H3 if previous line was empty
          const prev = processed[processed.length - 1] || '';
          const depth = prev === '' ? '##' : '###';
          processed.push(`${depth} ${labelValue.trim()}`);
          // Ensure blank line after a heading for proper rendering
          processed.push('');
          return;
        }

        // Reduce excessive internal whitespace (but preserve alignment in tables handled later)
        const squeezed = labelValue.replace(/\s{3,}/g, '  ');
        processed.push(squeezed);
      });

      // Close any open list at EOF
      if (inList) processed.push('');

      let md = processed.join('\n');

      // Post-pass A: normalize money artifacts like "- $$ 2,000.00$" → "- $2,000.00"
      md = md
        .replace(/\$\$\s*/g, '$')
        .replace(/(\d)\$/g, '$1')
        .replace(/\$\s+(\d)/g, '$$1');

      // Post-pass B: convert consecutive dotted/leader key-value rows into a table
      // Supports optional trailing notes column
      // e.g., "Taxes....................... $409.68" → "| Taxes | $409.68 |"
      // e.g., "Overpayment............... - $0.00$ note" → "| Overpayment | - $0.00 | note |"
      const lines2 = md.split(/\r?\n/);
      const out: string[] = [];
      let block: string[] = [];
      const kvRegex =
        /^\s*([A-Za-z][A-Za-z \-/()&%]+?)\s*[.:·•\-\s]{4,}\s*(\(?-?\$?[\d,]+(?:\.\d{1,2})?\)?|\$?0(?:\.00)?)\s*(.*)$/;
      const flushBlock = () => {
        if (block.length >= 2) {
          out.push('');
          const hasNotes = block.some(r => r.match(kvRegex)?.[3]?.trim());
          out.push(
            hasNotes ? '| Item | Amount | Notes |' : '| Item | Amount |'
          );
          out.push(hasNotes ? '| --- | ---: | --- |' : '| --- | ---: |');
          block.forEach(row => {
            const m = row.match(kvRegex);
            if (m) {
              const [_full, k, v, note] = m;
              const val = v.replace(/\)$/, '').replace(/^\(/, '-');
              if (hasNotes) {
                out.push(
                  `| ${k.trim()} | ${val.trim()} | ${note?.trim() || ''} |`
                );
              } else {
                out.push(`| ${k.trim()} | ${val.trim()} |`);
              }
            }
          });
          out.push('');
        } else {
          out.push(...block);
        }
        block = [];
      };

      for (const ln of lines2) {
        if (kvRegex.test(ln)) {
          block.push(ln);
        } else {
          if (block.length) flushBlock();
          out.push(ln);
        }
      }
      if (block.length) flushBlock();

      return out.join('\n');
    };

    // Lightweight formatter: convert pipe-delimited lines into GFM tables
    const toMarkdownTables = (input: string): string => {
      const lines = input.split(/\r?\n/);
      const output: string[] = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const pipeCount = (line.match(/\|/g) || []).length;
        const looksTabular = pipeCount >= 3 && line.includes('|');
        if (!looksTabular) {
          output.push(line);
          i++;
          continue;
        }

        // Collect consecutive pipe-heavy lines to form a table block
        const block: string[] = [];
        while (i < lines.length) {
          const l = lines[i];
          const pc = (l.match(/\|/g) || []).length;
          if (pc >= 3) {
            block.push(l);
            i++;
          } else {
            break;
          }
        }

        if (block.length > 0) {
          // Use first line as header; split on pipes and trim cells
          const split = (s: string) =>
            s
              .split('|')
              .map(c => c.trim())
              .filter(c => c.length > 0);
          const headerCells = split(block[0]);
          if (headerCells.length >= 2) {
            output.push('');
            output.push(`| ${headerCells.join(' | ')} |`);
            output.push(`| ${headerCells.map(() => '---').join(' | ')} |`);
            for (let r = 1; r < block.length; r++) {
              const rowCells = split(block[r]);
              // Pad/truncate to header length for stable table layout
              const normalized = headerCells.map(
                (_, idx) => rowCells[idx] ?? ''
              );
              output.push(`| ${normalized.join(' | ')} |`);
            }
            output.push('');
            continue;
          }
        }

        // Fallback if parsing failed
        output.push(...block);
      }
      return output.join('\n');
    };

    // Always prefer Markdown rendering for readability, even when highlights exist
    // We keep the highlights count badge in the UI controls, but avoid injecting raw HTML
    // so that our markdown structuring renders consistently.
    const md = toMarkdownTables(toStructuredMarkdown(text));
    return (
      <div className='prose prose-zinc dark:prose-invert max-w-none text-sm'>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {md}
        </ReactMarkdown>
      </div>
    );
  };

  // Render PDF viewer
  const renderPDFView = (doc: DocumentData, pageNum: number) => {
    // Handle file path - it's already in the format /uploads/filename.pdf
    const pdfUrl = doc.filePath || null;

    if (!pdfUrl) {
      return (
        <div className='flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
          <div className='text-center'>
            <ImageIcon className='h-16 w-16 text-zinc-400 mx-auto mb-4' />
            <p className='text-zinc-500 dark:text-zinc-400'>
              PDF not available
            </p>
            <p className='text-sm text-zinc-400 dark:text-zinc-500 mt-2'>
              Switch to extracted text view
            </p>
          </div>
        </div>
      );
    }

    // Use embed instead of iframe for better PDF rendering
    return (
      <div className='w-full h-full bg-white rounded-lg shadow-sm'>
        <div className='w-full h-[calc(100vh-16rem)] sm:h-[calc(100vh-14rem)] lg:h-[calc(100vh-12rem)]'>
          <embed
            src={`${pdfUrl}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            type='application/pdf'
            className='w-full h-full rounded-lg'
            title={`${doc.fileName} - Page ${pageNum}`}
          />
        </div>
      </div>
    );
  };

  const activeDocument = documents.find(d => d.id === activeTab);
  const activePage = activeDocument?.pages.find(
    p => p.pageNumber === currentPage
  );

  if (loading || busy) {
    return (
      <Card className='h-full'>
        <CardContent className='flex items-center justify-center h-full'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto'></div>
            <p className='mt-4 text-sm text-zinc-500 dark:text-zinc-400'>
              Loading documents...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className='h-full flex flex-col'>
        <CardHeader className='pb-4 flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <Eye className='h-4 w-4 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                  Document Evidence
                </h3>
                {selectedRule && highlights.length > 0 && (
                  <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                    {selectedRule
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase())}{' '}
                    •{highlights.length} evidence item
                    {highlights.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </CardTitle>

            {/* View Mode Toggle */}
            <div className='flex items-center gap-2'>
              <Button
                variant={viewMode === 'extracted' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('extracted')}
                className='h-8'
              >
                <FileText className='h-3.5 w-3.5 mr-1.5' />
                Extracted
              </Button>
              <Button
                variant={viewMode === 'pdf' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('pdf')}
                className='h-8'
              >
                <ImageIcon className='h-3.5 w-3.5 mr-1.5' />
                PDF
              </Button>

              <Button
                variant='outline'
                size='sm'
                className='h-8 ml-2'
                onClick={() => setIsFullscreen(true)}
              >
                <Eye className='h-3.5 w-3.5 mr-1.5' />
                Fullscreen
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className='p-0 flex-1 flex flex-col min-h-0'>
          {documents.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <p className='text-zinc-500 dark:text-zinc-400'>
                No documents available
              </p>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex-1 flex flex-col'
            >
              {/* Document Tabs */}
              <div className='px-6 pb-4'>
                <TabsList className='grid w-full grid-cols-2 h-12'>
                  {documents.map(doc => {
                    const docInfo = getDocumentInfo(doc);
                    const DocIcon = docInfo.icon;

                    return (
                      <TabsTrigger
                        key={doc.id}
                        value={doc.id}
                        className='flex items-center gap-2 h-10 px-4'
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded ${docInfo.bgColor}`}
                        >
                          <DocIcon className={`h-3.5 w-3.5 ${docInfo.color}`} />
                        </div>
                        <span className='text-sm font-medium'>
                          {docInfo.shortName}
                        </span>
                        <Badge variant='outline' className='ml-auto text-xs'>
                          {doc.pageCount} pages
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Document Content */}
              {documents.map(doc => (
                <TabsContent
                  key={doc.id}
                  value={doc.id}
                  className='flex-1 flex flex-col mt-0 min-h-0'
                >
                  {/* Controls */}
                  <div className='flex items-center justify-between px-6 py-3 border-b bg-zinc-50 dark:bg-zinc-800/50 flex-shrink-0'>
                    <div className='flex items-center gap-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className='h-8'
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </Button>
                      <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                        Page {currentPage} of {doc.pageCount}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage(
                            Math.min(doc.pageCount, currentPage + 1)
                          )
                        }
                        disabled={currentPage === doc.pageCount}
                        className='h-8'
                      >
                        <ChevronRight className='h-4 w-4' />
                      </Button>

                      {highlights.filter(h => h.page === currentPage).length >
                        0 && (
                        <>
                          <Separator orientation='vertical' className='h-4' />
                          <Badge variant='secondary' className='text-xs'>
                            <Highlighter className='h-3 w-3 mr-1' />
                            {
                              highlights.filter(h => h.page === currentPage)
                                .length
                            }{' '}
                            on this page
                          </Badge>
                        </>
                      )}

                      {activePage && activePage.confidence && (
                        <>
                          <Separator orientation='vertical' className='h-4' />
                          <Badge variant='outline' className='text-xs'>
                            {Math.round(activePage.confidence * 100)}%
                            confidence
                          </Badge>
                        </>
                      )}
                    </div>

                    <div className='flex items-center gap-2'>
                      {viewMode === 'pdf' && (
                        <>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setZoom(Math.max(50, zoom - 25))}
                            disabled={zoom <= 50}
                            className='h-8'
                          >
                            <ZoomOut className='h-4 w-4' />
                          </Button>
                          <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 w-12 text-center'>
                            {zoom}%
                          </span>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setZoom(Math.min(200, zoom + 25))}
                            disabled={zoom >= 200}
                            className='h-8'
                          >
                            <ZoomIn className='h-4 w-4' />
                          </Button>
                          <Separator orientation='vertical' className='h-4' />
                        </>
                      )}
                      <Button variant='outline' size='sm' className='h-8'>
                        <Download className='h-4 w-4' />
                      </Button>
                      {viewMode === 'extracted' && activePage && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8'
                          onClick={() => {
                            if (activePage?.rawText) {
                              navigator.clipboard
                                .writeText(activePage.rawText)
                                .catch(() => {});
                            }
                          }}
                          title='Copy raw OCR text to clipboard'
                        >
                          Copy Raw Text
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content Viewer */}
                  <div className='flex-1 overflow-auto bg-gray-50 dark:bg-zinc-900/50 min-h-0'>
                    {viewMode === 'extracted' ? (
                      <div className='h-full overflow-auto p-6'>
                        {activePage ? (
                          <div className='max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-0 overflow-hidden'>
                            {activePage.images &&
                            activePage.images.length > 0 ? (
                              <div className='bg-zinc-50 dark:bg-zinc-900 border-b grid grid-cols-1 gap-2 p-2'>
                                {activePage.images.map((src, idx) => (
                                  <img
                                    key={idx}
                                    alt={`Page ${activePage.pageNumber} extracted image ${idx + 1}`}
                                    src={src}
                                    className='w-full h-auto block rounded'
                                  />
                                ))}
                              </div>
                            ) : null}
                            <div className='p-8'>
                              {renderExtractedText(activePage)}
                              {/* Hidden debug container to retrieve raw OCR text via the console */}
                              <pre data-doc-debug className='hidden'>
                                {activePage.rawText || ''}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className='flex items-center justify-center h-full'>
                            <p className='text-zinc-500 dark:text-zinc-400'>
                              No content available for this page
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='h-full overflow-auto p-6'>
                        <div
                          className='mx-auto'
                          style={{
                            maxWidth: `${Math.min(800 * (zoom / 100), 1000)}px`,
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'top center',
                          }}
                        >
                          {renderPDFView(doc, currentPage)}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className='w-[95vw] h-[90vh] p-0'>
          <DialogHeader className='px-4 py-2'>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          <div className='h-[calc(90vh-48px)]'>
            {activeDocument &&
              (viewMode === 'extracted' ? (
                <ScrollArea className='h-full p-6'>
                  {activePage ? (
                    <div className='max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-8'>
                      {renderExtractedText(activePage)}
                    </div>
                  ) : (
                    <div className='flex items-center justify-center h-full'>
                      <p className='text-zinc-500 dark:text-zinc-400'>
                        No content available for this page
                      </p>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <div className='h-full p-4'>
                  {renderPDFView(activeDocument, currentPage)}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
