import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { createPortal } from 'react-dom';
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
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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

export type EvidenceJump = {
  docType: 'estimate' | 'roof_report';
  page: number;
  rule?: string;
  location?: string;
  textMatch?: string; // optional direct regex/snippet from left-side evidence
};

export type ViewerHandle = {
  jumpToEvidence: (t: EvidenceJump) => void;
};

export const EnhancedDocumentViewer = forwardRef<
  ViewerHandle,
  EnhancedDocumentViewerProps
>(function EnhancedDocumentViewer(
  {
    jobId,
    selectedRule,
    reloadVersion = 0,
    busy = false,
  }: EnhancedDocumentViewerProps,
  ref
) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  );
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pdf' | 'extracted'>('pdf');
  const [_showHighlights] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageOverlay, setImageOverlay] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({ isOpen: false, images: [], currentIndex: 0 });
  // Track which rule we already auto-navigated for, so we don't keep forcing the page/tab
  const [lastAutoRule, setLastAutoRule] = useState<string | null>(null);
  // Ensure we only set initial doc/page once per mount
  const hasInitializedRef = useRef(false);
  const [pendingTarget, setPendingTarget] = useState<EvidenceJump | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      jumpToEvidence: (t: EvidenceJump) => {
        console.log('📍 EnhancedDocumentViewer.jumpToEvidence called with:', t);

        // CHECK #2: Are documents loaded?
        console.log(
          '📚 Documents loaded:',
          documents.length,
          documents.map(d => ({
            id: d.id,
            type: d.fileType,
            fileName: d.fileName,
          }))
        );
        console.log('🔍 Looking for docType:', t.docType);
        console.log(
          '🔍 Available fileTypes:',
          documents.map(d => d.fileType)
        );
        if (documents.length === 0) {
          console.error(
            '❌ CRITICAL: No documents loaded yet - this could be the issue!'
          );
          return;
        }

        const targetDoc =
          documents.find(d => d.fileType === t.docType) ?? documents[0];
        console.log(
          '🎯 Target document:',
          targetDoc
            ? {
                id: targetDoc.id,
                type: targetDoc.fileType,
                pageCount: targetDoc.pageCount,
              }
            : 'NOT FOUND'
        );

        if (targetDoc) {
          console.log('🏷️  Setting active tab to:', targetDoc.id);
          setActiveTab(targetDoc.id);
        } else {
          console.error(
            '❌ Could not find target document for type:',
            t.docType
          );
        }

        console.log('🖥️  Setting view mode to extracted');
        setViewMode('extracted'); // Use extracted view for working navigation

        const clamped = Math.min(
          Math.max(1, t.page),
          targetDoc?.pageCount ?? t.page
        );
        console.log(
          '📖 Setting current page to:',
          clamped,
          '(clamped from',
          t.page,
          ')'
        );
        setCurrentPage(clamped);
        setPendingTarget({ ...t, page: clamped });

        console.log('🔄 State updates queued - React should re-render now');

        // Ensure we actually scroll to the target page immediately
        // (highlight scroll will follow once the mark is rendered)
        try {
          console.log('🏃‍♂️ Calling scrollToPage:', clamped);
          scrollToPage(clamped);
        } catch (error) {
          console.error('❌ Error in scrollToPage:', error);
        }
      },
    }),
    [documents]
  );

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
    setViewMode('extracted'); // Use extracted view for working navigation
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
        // Primary estimate line item
        {
          type: 'line-item',
          description:
            'Hip/Ridge cap - Standard profile - composition shingles',
          page: 4,
          relevance: 'high',
          location: 'Line RFG RIDGC',
          value: '93.32 LF @ $12.05 = $1,147.66',
          issue: true,
          textMatch:
            'Hip.*Ridge.*cap.*Standard.*profile|RFG.*RIDGC|Ridge.*cap.*composition',
        },
        // Alternative line item patterns
        {
          type: 'line-item',
          description: 'Ridge cap line item (alternative format)',
          page: 4,
          relevance: 'high',
          location: 'Estimate line item',
          value: 'Ridge cap materials and labor',
          issue: true,
          textMatch: '93\\.32.*LF|\\$1,?147\\.66|\\$12\\.05',
        },
        // Roof report measurements - Ridges
        {
          type: 'measurement',
          description: 'Ridge measurements from roof report',
          page: 2,
          relevance: 'high',
          location: 'Roof Report - Ridges',
          value: 'Ridges: 101 LF',
          textMatch: 'Ridges.*101|Ridge.*101.*LF|Total.*Ridge.*101',
        },
        // Roof report measurements - Hips
        {
          type: 'measurement',
          description: 'Hip measurements from roof report',
          page: 2,
          relevance: 'high',
          location: 'Roof Report - Hips',
          value: 'Hips: 6 LF',
          textMatch: 'Hips.*6|Hip.*6.*LF|Total.*Hip.*6',
        },
        // Combined ridge/hip total
        {
          type: 'calculation',
          description: 'Total ridge and hip length required',
          page: 2,
          relevance: 'high',
          location: 'Roof Report Summary',
          value: 'Combined: 107 LF',
          textMatch: '107.*LF|Total.*107|Ridge.*Hip.*107',
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

  // Always highlight text that's referenced by the current rule
  const resolveMatch = (pageNumber: number): RegExp | null => {
    // Helper to escape user-provided text for safe regex usage
    const escapeRegExp = (s: string) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // If a direct textMatch was requested for this page, prioritize it
    if (
      pendingTarget &&
      pendingTarget.page === pageNumber &&
      pendingTarget.textMatch
    ) {
      try {
        // Escape dynamic text to avoid breaking regex with special chars
        const safe = escapeRegExp(pendingTarget.textMatch);
        return new RegExp(safe, 'i');
      } catch {
        // fall through to rule-based patterns
      }
    }
    if (!selectedRule) return null;

    // Get all highlights for the current rule on this page
    const pageHighlights = getHighlights(selectedRule).filter(
      h => h.page === pageNumber && h.textMatch
    );

    if (pageHighlights.length === 0) return null;

    // Combine all textMatch patterns for this page into one regex
    const patterns = pageHighlights.map(h => h.textMatch!).filter(Boolean);

    if (patterns.length === 0) return null;

    try {
      // Create a single regex that matches any of the patterns
      const combinedPattern = patterns.join('|');
      return new RegExp(`(${combinedPattern})`, 'gi');
    } catch {
      // If combined regex fails, try the first pattern only
      try {
        return new RegExp(patterns[0], 'i');
      } catch {
        return null;
      }
    }
  };

  // Get all images from all pages of active document for global navigation
  const getAllImagesFromDocument = (document: DocumentData) => {
    const allImages: string[] = [];
    document.pages.forEach(page => {
      if (page.images) {
        allImages.push(...page.images);
      }
    });
    return allImages;
  };

  // Image overlay functions
  const openImageOverlay = (clickedImage: string, document: DocumentData) => {
    const allImages = getAllImagesFromDocument(document);
    const startIndex = allImages.indexOf(clickedImage);
    setImageOverlay({
      isOpen: true,
      images: allImages,
      currentIndex: startIndex >= 0 ? startIndex : 0,
    });
  };

  const closeImageOverlay = useCallback(() => {
    setImageOverlay({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  const nextImage = useCallback(() => {
    setImageOverlay(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  }, []);

  const prevImage = useCallback(() => {
    setImageOverlay(prev => ({
      ...prev,
      currentIndex:
        prev.currentIndex === 0
          ? prev.images.length - 1
          : prev.currentIndex - 1,
    }));
  }, []);

  const downloadCurrentImage = () => {
    if (imageOverlay.images.length > 0) {
      const link = document.createElement('a');
      link.href = imageOverlay.images[imageOverlay.currentIndex];
      link.download = `image-${imageOverlay.currentIndex + 1}.jpeg`;
      link.click();
    }
  };

  // Keyboard navigation for image overlay
  useEffect(() => {
    if (!imageOverlay.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (imageOverlay.images.length > 1) prevImage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (imageOverlay.images.length > 1) nextImage();
          break;
        case 'Escape':
          e.preventDefault();
          closeImageOverlay();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    imageOverlay.isOpen,
    imageOverlay.images.length,
    prevImage,
    nextImage,
    closeImageOverlay,
  ]);

  // Auto-update current page based on scroll position
  useEffect(() => {
    if (!scrollContainer || viewMode !== 'extracted') return;

    const handleScroll = () => {
      // Find all page elements
      const pageElements =
        scrollContainer.querySelectorAll('[data-page-number]');

      // Find which page is most visible
      let mostVisiblePage = 1;
      let maxVisibleHeight = 0;

      pageElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Calculate how much of this page is visible
        const visibleTop = Math.max(rect.top, containerRect.top);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        if (visibleHeight > maxVisibleHeight) {
          maxVisibleHeight = visibleHeight;
          mostVisiblePage = parseInt(
            element.getAttribute('data-page-number') || '1'
          );
        }
      });

      setCurrentPage(mostVisiblePage);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, viewMode]);

  // After a jumpToEvidence, scroll to the injected mark (or at least the target page)
  useEffect(() => {
    if (!pendingTarget || !scrollContainer || viewMode !== 'extracted') return;
    const id = requestAnimationFrame(() => {
      // Double RAF to ensure tab switch + markdown render completed
      const id2 = requestAnimationFrame(() => {
        const root = scrollContainer;
        // First try to find any highlighted text on the target page
        const pageEl = root.querySelector(
          `[data-page-number="${pendingTarget.page}"]`
        ) as HTMLElement | null;

        if (pageEl) {
          // Look for highlighted elements within this page
          const highlight = pageEl.querySelector(
            '.evidence-highlight'
          ) as HTMLElement | null;
          if (highlight) {
            // Scroll to the first highlighted element on the page
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            // Fallback to page top if no highlights found
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        // Clear the pending target after scrolling so user can navigate freely
        setPendingTarget(null);
      });
      (window as any).__eod_jump_raf2 &&
        cancelAnimationFrame((window as any).__eod_jump_raf2);
      (window as any).__eod_jump_raf2 = id2;
    });
    return () => cancelAnimationFrame(id);
  }, [pendingTarget, scrollContainer, viewMode, activeTab, currentPage]);

  // Jump to page when navigation buttons are clicked
  const scrollToPage = (pageNumber: number) => {
    if (!scrollContainer) return;

    const pageElement = scrollContainer.querySelector(
      `[data-page-number="${pageNumber}"]`
    );
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCurrentPage(pageNumber);
  };

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

  // Render all pages in a stacked scrollable layout
  const renderAllPagesStacked = (document: DocumentData) => {
    return (
      <div className='space-y-0'>
        {document.pages.map((page, pageIndex) => (
          <div
            key={page.pageNumber}
            className='relative'
            data-page-number={page.pageNumber}
          >
            {/* Page divider with floating page number (skip for first page) */}
            {pageIndex > 0 && (
              <div className='relative my-8'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-200 dark:border-gray-700'></div>
                </div>
                <div className='relative flex justify-center'>
                  <div className='bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-zinc-900'>
                    Page {page.pageNumber}
                    {highlights.filter(h => h.page === page.pageNumber).length >
                      0 && (
                      <Badge variant='secondary' className='text-xs ml-2'>
                        <Highlighter className='h-3 w-3 mr-1' />
                        {
                          highlights.filter(h => h.page === page.pageNumber)
                            .length
                        }
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Page content */}
            <div className='bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-8 overflow-hidden'>
              {renderExtractedText(page, document)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render extracted text with optional markdown and highlights
  const renderExtractedText = (page: DocumentPage, document?: DocumentData) => {
    // Normalize escape sequences that sometimes arrive as literal characters
    let text = page.rawText || '';
    // Turn literal "\n" into real newlines, and "\t" into spaces
    text = text.replace(/\\n/g, '\n').replace(/\\t/g, '  ');
    // Fix currency formatting issues
    text = text.replace(/\\\$/g, '$'); // Remove escaped dollars
    text = text.replace(/\$\s*\$/g, '$'); // Fix duplicate $$
    text = text.replace(/\$\s+\(/g, '$-('); // Fix negative currency
    text = text.replace(/\(\s*\$\s*/g, '($'); // Normalize negative currency formatting

    // Determine highlights for this page up-front
    const _pageHighlights = highlights.filter(h => h.page === page.pageNumber);

    // Determine if this is a roof report page for special formatting
    const isRoofReport =
      /^(ROOF MEASUREMENTS|EAGLEVIEW|HOVER|Source - EagleView|Precise Aerial Measurement|Property Address.*\d{5}|Ridge Length|Hip Length|Total Squares|Predominant Pitch)/im.test(
        text
      );

    // Unified markdown processing pipeline for consistent rendering
    // This replaces the dual-path logic that was causing inconsistent table rendering
    // 1) Promote probable section headings (ALL CAPS lines, or Title Case lines with no trailing colon) to H2/H3
    // 2) Bold label-value pairs like "Claim Number: 123" → **Claim Number**: 123
    // 3) Convert enumerated items like "3a. Remove Flashing" to bullet list items
    // 4) Preserve existing paragraphs and whitespace sensibly
    const processMarkdown = (input: string): string => {
      // Pre-pass: normalize text and add logical breaks
      const processed = input
        // Normalize pipes for better table detection
        .replace(/\|{2,}/g, '|')
        .replace(/\s*\|\s*/g, ' | ')
        // Add breaks before section headers and important labels
        .replace(
          /\s(Subtotals|Estimate Total|Estimated Total RC|Loss of Use|Claim Number|Policy Number|Type of Loss|Insurance Company|Date of Loss|Property|Benefits|Taxes|Replacement Cost|Deductible|Overpayment|Summary of this Payment)\b/g,
          '\n$1'
        )
        // Break before label-like patterns "Word Word:"
        .replace(/([^\n])\s([A-Z][A-Za-z /()&]+:\s)/g, '$1\n$2')
        // Add soft breaks after sentences if still in single line
        .replace(/\.\s+(?=[A-Z])/g, '.\n');

      const lines = processed.split(/\r?\n/);
      const output: string[] = [];

      // Process each line for markdown formatting
      lines.forEach((line, index) => {
        let processedLine = line.trim();

        // Skip empty lines
        if (!processedLine) {
          output.push('');
          return;
        }

        // Handle pipe-separated content (potential tables)
        if (processedLine.includes('|')) {
          const parts = processedLine
            .split('|')
            .map(p => p.trim())
            .filter(p => p);

          // Simple key-value pairs (convert to bold label format)
          if (parts.length === 2) {
            const [label, value] = parts;

            // Check if this looks like a document header/value pair
            const isDocumentLabel =
              /^(Customer Name|Property Address|Insured|Property|Claim Rep|Estimator|Insurance Company|Carrier|Policy Number|LORI HOUSER|Claim Number|Date of Loss|CLAIM NUMBER|Summary For|REPLACEMENT COST)/i.test(
                label
              ) ||
              /^\d{10,}$/.test(value) || // Claim numbers
              /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) || // Dates
              /^\$[\d,]+\.?\d*$/.test(value) || // Currency
              /^[A-Z][a-z]+,\s+[A-Z]{2}\s+\d{5}/.test(value); // Addresses

            if (isDocumentLabel) {
              output.push(`**${label}:** ${value}`);
              return;
            }
          }

          // Multi-column content (keep as potential table)
          if (parts.length >= 3) {
            // Look ahead to see if this is part of a table
            const nextLine = lines[index + 1];
            const hasTableContext =
              (nextLine &&
                nextLine.includes('|') &&
                nextLine.split('|').filter(p => p.trim()).length >= 3) ||
              parts.some(p =>
                /^(DESCRIPTION|QTY|QUANTITY|UNIT|PRICE|TAX|RCV|ACV|DEPREC|TOTAL)/i.test(
                  p.trim()
                )
              );

            if (hasTableContext) {
              // Keep as table row
              output.push(`| ${parts.join(' | ')} |`);
              return;
            }
          }

          // Fallback: join parts with dashes
          output.push(parts.join(' - '));
          return;
        }

        // Convert label-value pairs to bold format
        processedLine = processedLine.replace(
          /^([A-Z][A-Za-z ]{2,}?):\s*(.+)$/,
          '**$1:** $2'
        );

        // Convert numbered/lettered lists to markdown bullets
        processedLine = processedLine.replace(
          /^(\d+[a-zA-Z]?)\.\s*(.+)$/,
          '- $2'
        );

        // Make important sections bold
        if (!processedLine.includes('**')) {
          processedLine = processedLine
            .replace(/(Summary For Coverage [A-Z][\s\-\w]*)/g, '**$1**')
            .replace(
              /(Total [A-Z\s]+Settlement|Total Outstanding|Net Claim|Line Item Total|Material Sales Tax|Grand Total)/gi,
              '**$1**'
            )
            .replace(
              /^(ESTIMATE|ROOF REPORT|EAGLEVIEW|HOVER|Source -|Precise Aerial Measurement Report|AGR Roofing and Construction)/gim,
              '**$1**'
            )
            .replace(
              /(Total Squares|Total Area|Predominant Pitch|Total Eaves|Total Rakes|Total Ridge[s]?\/Hip[s]?|Squares|Ridge Length|Hip Length):/gi,
              '**$1:**'
            )
            .replace(
              /^(\d+\s+[A-Z][a-z]+.*(?:Avenue|Ave|Street|St|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd).*)/gim,
              '**$1**'
            );
        }

        // Detect and format as headings
        const isHeading =
          (/^[A-Z0-9 &()\/\-.,']{6,}$/.test(processedLine) &&
            /\s[A-Z]/.test(processedLine)) ||
          (/^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){1,}$/.test(processedLine) &&
            !processedLine.endsWith(':'));

        if (
          isHeading &&
          !/(Phone|Fax|Email|E-mail|\d{3}[-). ]?\d{3}[-.]?\d{4})/i.test(
            processedLine
          )
        ) {
          output.push(`## ${processedLine}`);
          output.push(''); // Add blank line after heading
          return;
        }

        output.push(processedLine);
      });

      // Post-process: convert consecutive table-like lines to proper markdown tables
      const finalOutput: string[] = [];
      let tableLines: string[] = [];

      for (let i = 0; i < output.length; i++) {
        const line = output[i];

        if (line.startsWith('|') && line.endsWith('|')) {
          tableLines.push(line);
        } else {
          // Flush any accumulated table
          if (tableLines.length > 0) {
            if (tableLines.length >= 2) {
              // Add table header separator if missing
              const headerCells = tableLines[0]
                .split('|')
                .filter(p => p.trim()).length;
              finalOutput.push('');
              finalOutput.push(tableLines[0]);

              // Add separator if the second line isn't already one
              if (!tableLines[1].includes('---')) {
                finalOutput.push('|' + ' --- |'.repeat(headerCells));
                finalOutput.push(...tableLines.slice(1));
              } else {
                finalOutput.push(...tableLines.slice(1));
              }
              finalOutput.push('');
            } else {
              finalOutput.push(...tableLines);
            }
            tableLines = [];
          }
          finalOutput.push(line);
        }
      }

      // Flush any remaining table
      if (tableLines.length > 0) {
        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split('|')
            .filter(p => p.trim()).length;
          finalOutput.push('');
          finalOutput.push(tableLines[0]);
          if (!tableLines[1].includes('---')) {
            finalOutput.push('|' + ' --- |'.repeat(headerCells));
            finalOutput.push(...tableLines.slice(1));
          } else {
            finalOutput.push(...tableLines.slice(1));
          }
          finalOutput.push('');
        } else {
          finalOutput.push(...tableLines);
        }
      }

      return finalOutput
        .join('\n')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();
    };

    // Always prefer Markdown rendering for readability, even when highlights exist
    // We keep the highlights count badge in the UI controls, but avoid injecting raw HTML
    // so that our markdown structuring renders consistently.
    const processedMarkdown = processMarkdown(text);
    return (
      <div
        className={`prose prose-zinc dark:prose-invert max-w-none text-sm prose-table:text-xs prose-th:font-medium prose-td:p-2 prose-img:max-w-full prose-img:h-auto overflow-x-hidden ${
          isRoofReport
            ? 'prose-headings:text-emerald-700 dark:prose-headings:text-emerald-400'
            : ''
        }`}
      >
        {isRoofReport && page.images && page.images.length > 0 && (
          <div className='mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800'>
            <div className='flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 mb-2'>
              <ImageIcon className='h-4 w-4' />
              <span className='font-medium'>
                Roof Report Diagrams ({page.images.length} available)
              </span>
            </div>
            <p className='text-xs text-emerald-600 dark:text-emerald-400'>
              This page contains visual roof measurements and diagrams extracted
              from the aerial imagery report.
            </p>
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
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
              <thead className='bg-gray-50 dark:bg-gray-800'>{children}</thead>
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
            // Custom image rendering with click-to-expand
            img: ({ src, alt, ...props }) => {
              if (!src) return null;
              const isPageImage =
                typeof src === 'string' && page.images?.includes(src);
              if (!isPageImage) {
                return (
                  <img
                    src={src}
                    alt={alt}
                    {...props}
                    className='max-w-full h-auto'
                  />
                );
              }
              return (
                <img
                  src={src}
                  alt={alt}
                  {...props}
                  className='max-w-full h-auto cursor-pointer rounded-lg border hover:shadow-lg transition-shadow duration-200 my-4'
                  onClick={() => {
                    if (src && document) {
                      openImageOverlay(src, document);
                    }
                  }}
                  title='Click to expand'
                />
              );
            },
          }}
        >
          {(() => {
            const rx = resolveMatch(page.pageNumber);
            return rx
              ? processedMarkdown.replace(
                  rx,
                  (match: string) =>
                    `<mark class="evidence-highlight">${match}</mark>`
                )
              : processedMarkdown;
          })()}
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
      <Card className='h-full flex flex-col overflow-hidden mb-0 rounded-b-none'>
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

        <CardContent className='p-0 flex-1 flex flex-col min-h-0 overflow-hidden'>
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
              className='flex-1 flex flex-col overflow-hidden'
            >
              {/* Document Tabs */}
              <div className='px-6 pb-4'>
                <TabsList
                  className={`grid w-full h-12 ${
                    documents.length === 1
                      ? 'grid-cols-1'
                      : documents.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                  }`}
                >
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
                  className='flex-1 flex flex-col mt-0 min-h-0 overflow-hidden'
                >
                  {/* Controls */}
                  <div className='flex items-center justify-between px-6 py-3 border-b bg-zinc-50 dark:bg-zinc-800/50 flex-shrink-0'>
                    <div className='flex items-center gap-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          scrollToPage(Math.max(1, currentPage - 1))
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
                          scrollToPage(Math.min(doc.pageCount, currentPage + 1))
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

                  {/* Content Viewer - Stacked Pages */}
                  <div className='flex-1 overflow-auto bg-gray-50 dark:bg-zinc-900/50 min-h-0'>
                    {viewMode === 'extracted' ? (
                      <div
                        className='h-full overflow-auto p-6'
                        ref={setScrollContainer}
                      >
                        <div className='max-w-4xl mx-auto overflow-x-hidden'>
                          {renderAllPagesStacked(doc)}
                          {/* Hidden debug container for all pages */}
                          <pre data-doc-debug className='hidden'>
                            {doc.pages
                              .map(p => p.rawText || '')
                              .join('\n\n--- PAGE BREAK ---\n\n')}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className='h-full overflow-auto p-6'>
                        <div className='max-w-4xl mx-auto space-y-0'>
                          {/* Render all PDF pages stacked */}
                          {doc.pages.map((page, pageIndex) => (
                            <div key={page.pageNumber} className='relative'>
                              {/* Page divider with floating page number (skip for first page) */}
                              {pageIndex > 0 && (
                                <div className='relative my-8'>
                                  <div className='absolute inset-0 flex items-center'>
                                    <div className='w-full border-t border-gray-200 dark:border-gray-700'></div>
                                  </div>
                                  <div className='relative flex justify-center'>
                                    <div className='bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-zinc-900'>
                                      Page {page.pageNumber}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div
                                className='mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm border overflow-hidden'
                                style={{
                                  maxWidth: `${Math.min(800 * (zoom / 100), 1000)}px`,
                                  transform: `scale(${zoom / 100})`,
                                  transformOrigin: 'top center',
                                }}
                              >
                                {renderPDFView(doc, page.pageNumber)}
                              </div>
                            </div>
                          ))}
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

      {/* Image Overlay Modal - Portal to document.body */}
      {imageOverlay.isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className='fixed inset-0 z-[9999] flex items-center justify-center'>
            {/* Backdrop with blur */}
            <div
              className='absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'
              onClick={closeImageOverlay}
            />

            {/* Close button */}
            <Button
              variant='ghost'
              size='sm'
              className='absolute top-4 right-4 z-10 h-10 w-10 p-0 bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110'
              onClick={closeImageOverlay}
            >
              <X className='h-4 w-4' />
            </Button>

            {/* Image counter */}
            {imageOverlay.images.length > 1 && (
              <div className='absolute top-4 left-4 z-10 bg-black/40 text-white px-3 py-1.5 rounded-full text-sm font-medium border border-white/20 backdrop-blur-sm'>
                {imageOverlay.currentIndex + 1} of {imageOverlay.images.length}
              </div>
            )}

            {/* Download button */}
            <Button
              variant='ghost'
              size='sm'
              className='absolute top-4 right-16 z-10 h-10 w-10 p-0 bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110'
              onClick={downloadCurrentImage}
              title='Download image'
            >
              <Download className='h-4 w-4' />
            </Button>

            {/* Previous button */}
            {imageOverlay.images.length > 1 && (
              <Button
                variant='ghost'
                size='lg'
                className='absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 p-0 bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110'
                onClick={prevImage}
                title='Previous image (←)'
              >
                <ChevronLeft className='h-6 w-6' />
              </Button>
            )}

            {/* Next button */}
            {imageOverlay.images.length > 1 && (
              <Button
                variant='ghost'
                size='lg'
                className='absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 p-0 bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110'
                onClick={nextImage}
                title='Next image (→)'
              >
                <ChevronRight className='h-6 w-6' />
              </Button>
            )}

            {/* Main image container with fly-in animation */}
            {imageOverlay.images.length > 0 && (
              <div className='relative z-5 flex items-center justify-center w-full h-full p-8 animate-in fade-in zoom-in-95 duration-200'>
                <img
                  src={imageOverlay.images[imageOverlay.currentIndex]}
                  alt={`Image ${imageOverlay.currentIndex + 1}`}
                  className='max-w-full max-h-full object-contain rounded-lg shadow-2xl'
                  style={{
                    maxWidth: 'calc(100vw - 8rem)',
                    maxHeight: 'calc(100vh - 8rem)',
                    filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))',
                  }}
                />
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
});
