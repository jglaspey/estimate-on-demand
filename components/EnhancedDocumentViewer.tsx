import { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
  Home,
  Calculator,
  FileText,
  Image,
  ToggleLeft,
  ToggleRight,
  Highlighter,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface DocumentPage {
  pageNumber: number;
  content: any; // JSON content from extraction
  rawText: string | null;
  wordCount: number;
  confidence: number | null;
  dimensions?: {
    width: number | null;
    height: number | null;
  };
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
}: EnhancedDocumentViewerProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pdf' | 'extracted'>('extracted');
  const [showHighlights, setShowHighlights] = useState(true);

  // Fetch documents and their extracted content
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/documents`);
        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        setDocuments(data.documents);

        // Set the first document as active
        if (data.documents.length > 0) {
          setActiveTab(data.documents[0].id);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchDocuments();
    }
  }, [jobId]);

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

  // Auto-switch to relevant page based on rule
  useEffect(() => {
    if (selectedRule && highlights.length > 0) {
      const firstHighlight = highlights[0];
      setCurrentPage(firstHighlight.page);

      // Find the appropriate document
      const targetDoc = documents.find(doc => {
        if (firstHighlight.page <= 4 && doc.fileType === 'estimate')
          return true;
        if (firstHighlight.page > 4 && doc.fileType === 'roof_report')
          return true;
        return false;
      });

      if (targetDoc) {
        setActiveTab(targetDoc.id);
      }
    }
  }, [selectedRule, highlights, documents]);

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

  // Render extracted text with highlights
  const renderExtractedText = (page: DocumentPage) => {
    const text = page.rawText || '';

    if (!showHighlights || !selectedRule) {
      return (
        <div className='whitespace-pre-wrap font-mono text-sm'>{text}</div>
      );
    }

    // Find highlights for this page
    const pageHighlights = highlights.filter(h => h.page === page.pageNumber);

    // Apply highlights to text
    let highlightedText = text;
    pageHighlights.forEach(highlight => {
      if (highlight.textMatch) {
        const regex = new RegExp(highlight.textMatch, 'gi');
        highlightedText = highlightedText.replace(regex, match => {
          const className = highlight.issue
            ? 'bg-red-200 dark:bg-red-900/50 border-b-2 border-red-500'
            : 'bg-yellow-200 dark:bg-yellow-900/50 border-b-2 border-yellow-500';
          return `<mark class="${className} px-1 rounded">${match}</mark>`;
        });
      }
    });

    return (
      <div
        className='whitespace-pre-wrap font-mono text-sm'
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
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
            <Image
              className='h-16 w-16 text-zinc-400 mx-auto mb-4'
              alt='PDF not available'
            />
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
        <embed
          src={`${pdfUrl}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          type='application/pdf'
          className='w-full h-full rounded-lg'
          title={`${doc.fileName} - Page ${pageNum}`}
        />
      </div>
    );
  };

  const activeDocument = documents.find(d => d.id === activeTab);
  const activePage = activeDocument?.pages.find(
    p => p.pageNumber === currentPage
  );

  if (loading) {
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
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-4'>
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
              <Image className='h-3.5 w-3.5 mr-1.5' alt='PDF' />
              PDF
            </Button>

            {viewMode === 'extracted' && (
              <div className='ml-2 flex items-center gap-2'>
                <span className='text-xs text-zinc-500'>Highlights</span>
                <button
                  onClick={() => setShowHighlights(!showHighlights)}
                  className='p-1'
                >
                  {showHighlights ? (
                    <ToggleRight className='h-5 w-5 text-blue-600' />
                  ) : (
                    <ToggleLeft className='h-5 w-5 text-zinc-400' />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0 flex-1 flex flex-col overflow-hidden'>
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

            {/* Measurement Comparison for Ridge Cap */}
            {selectedRule === 'ridge_cap' && viewMode === 'extracted' && (
              <div className='px-6 py-4 border-y bg-red-50 dark:bg-red-950/20'>
                <div className='flex items-center gap-2 mb-3'>
                  <Calculator className='h-4 w-4 text-red-600 dark:text-red-400' />
                  <h4 className='text-sm font-medium text-red-900 dark:text-red-100'>
                    Measurement Comparison
                  </h4>
                </div>
                <div className='grid grid-cols-2 gap-4 text-xs'>
                  <div className='p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800'>
                    <div className='font-medium text-red-900 dark:text-red-100 mb-2'>
                      From Estimate:
                    </div>
                    <div className='space-y-1 text-red-700 dark:text-red-300'>
                      <div>• Ridge cap: 6.00 LF</div>
                      <div>• Type: Standard profile ✓</div>
                      <div>• Rate: $42.90/LF</div>
                    </div>
                  </div>
                  <div className='p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800'>
                    <div className='font-medium text-red-900 dark:text-red-100 mb-2'>
                      From EagleView:
                    </div>
                    <div className='space-y-1 text-red-700 dark:text-red-300'>
                      <div>• Total: 119 ft</div>
                      <div>• Ridges: 26 ft, Hips: 93 ft</div>
                      <div>• Shortage: 113 LF (95% short)</div>
                    </div>
                  </div>
                </div>
                <div className='mt-3 p-2 bg-red-200 border border-red-300 rounded text-center dark:bg-red-800 dark:border-red-700'>
                  <span className='text-sm font-semibold text-red-900 dark:text-red-100'>
                    💰 Supplement Impact: 113 LF × $4.50 = $508.50
                  </span>
                </div>
              </div>
            )}

            {/* Document Content */}
            {documents.map(doc => (
              <TabsContent
                key={doc.id}
                value={doc.id}
                className='flex-1 flex flex-col mt-0 overflow-hidden'
              >
                {/* Controls */}
                <div className='flex items-center justify-between px-6 py-3 border-b bg-zinc-50 dark:bg-zinc-800/50'>
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
                        setCurrentPage(Math.min(doc.pageCount, currentPage + 1))
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
                          {Math.round(activePage.confidence * 100)}% confidence
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
                  </div>
                </div>

                {/* Content Viewer */}
                <div className='flex-1 overflow-auto bg-gray-50 dark:bg-zinc-900/50'>
                  {viewMode === 'extracted' ? (
                    <ScrollArea className='h-full p-6'>
                      {activePage ? (
                        <div className='max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-8'>
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
                    <div className='h-full p-6'>
                      <div
                        className='h-full mx-auto'
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
  );
}
