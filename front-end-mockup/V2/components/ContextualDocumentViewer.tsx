import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Receipt,
  Home,
  AlertTriangle,
  Calculator,
  ExternalLink,
  Info,
  ArrowUpRight
} from 'lucide-react';
import { DocumentData } from '../lib/mockData';

interface ContextualDocumentViewerProps {
  documents: DocumentData[];
  selectedRule: string | null;
  highlightedLocation?: string | null;
}

interface DocumentHighlight {
  type: 'line-item' | 'measurement' | 'calculation' | 'note';
  description: string;
  page: number;
  relevance: 'high' | 'medium' | 'low';
  location: string;
  value?: string;
  issue?: boolean;
}

interface EvidenceChip {
  id: string;
  label: string;
  value: string;
  location: string;
  docType: 'estimate' | 'roof_report';
  page: number;
  line?: string;
}

export function ContextualDocumentViewer({ documents, selectedRule, highlightedLocation }: ContextualDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState(documents[0]?.id || '');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const totalPages = 6;

  // Generate evidence chips based on selected rule
  const getEvidenceChips = (rule: string | null): EvidenceChip[] => {
    if (!rule) return [];
    
    const evidenceMap = {
      ridge_cap: [
        {
          id: 'estimate-ridge-cap',
          label: 'Estimate ridge cap',
          value: '6 LF',
          location: 'Page 4, Line 3b',
          docType: 'estimate' as const,
          page: 4,
          line: '3b'
        },
        {
          id: 'report-ridges',
          label: 'Ridges',
          value: '26 LF',
          location: 'Page 2, Section 3',
          docType: 'roof_report' as const,
          page: 2
        },
        {
          id: 'report-hips',
          label: 'Hips',
          value: '93 LF',
          location: 'Page 2, Section 3',
          docType: 'roof_report' as const,
          page: 2
        }
      ],
      starter_strip: [
        {
          id: 'estimate-starter',
          label: 'Starter course note',
          value: 'included in waste',
          location: 'Page 4, Options',
          docType: 'estimate' as const,
          page: 4
        },
        {
          id: 'report-eaves',
          label: 'Total Eaves',
          value: '180 LF',
          location: 'Page 2, Measurements',
          docType: 'roof_report' as const,
          page: 2
        }
      ]
    };
    
    return evidenceMap[rule as keyof typeof evidenceMap] || [];
  };

  const evidenceChips = getEvidenceChips(selectedRule);

  // Interactive Roof Diagram Component
  const RoofDiagram = () => {
    if (selectedRule !== 'ridge_cap') return null;

    const handleSegmentClick = (segmentId: string) => {
      if (segmentId === 'ridges') {
        setCurrentPage(2);
        setActiveTab(documents.find(d => d.fileType === 'roof_report')?.id || '');
      } else if (segmentId === 'hips') {
        setCurrentPage(2);
        setActiveTab(documents.find(d => d.fileType === 'roof_report')?.id || '');
      }
    };

    const handleSegmentHover = (segmentId: string | null) => {
      setHoveredSegment(segmentId);
    };

    return (
      <div className="p-4 bg-white border rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-zinc-900 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Interactive Roof Diagram
          </h4>
          <div className="text-xs text-zinc-500">
            Click segments to view measurements
          </div>
        </div>
        
        <div className="relative">
          {/* SVG Roof Diagram */}
          <svg width="100%" height="200" viewBox="0 0 400 200" className="border rounded bg-blue-50">
            {/* Main Roof Shape */}
            <polygon 
              points="50,150 200,50 350,150 350,170 50,170" 
              fill="#e0f2fe" 
              stroke="#0ea5e9" 
              strokeWidth="2"
            />
            
            {/* Ridge Line */}
            <line 
              x1="200" y1="50" 
              x2="200" y2="150" 
              stroke={hoveredSegment === 'ridges' ? '#dc2626' : '#0ea5e9'}
              strokeWidth={hoveredSegment === 'ridges' ? "4" : "3"}
              className="cursor-pointer"
              onMouseEnter={() => handleSegmentHover('ridges')}
              onMouseLeave={() => handleSegmentHover(null)}
              onClick={() => handleSegmentClick('ridges')}
            />
            
            {/* Hip Lines */}
            <line 
              x1="50" y1="150" 
              x2="200" y2="50" 
              stroke={hoveredSegment === 'hips' ? '#dc2626' : '#059669'}
              strokeWidth={hoveredSegment === 'hips' ? "4" : "3"}
              className="cursor-pointer"
              onMouseEnter={() => handleSegmentHover('hips')}
              onMouseLeave={() => handleSegmentHover(null)}
              onClick={() => handleSegmentClick('hips')}
            />
            <line 
              x1="350" y1="150" 
              x2="200" y2="50" 
              stroke={hoveredSegment === 'hips' ? '#dc2626' : '#059669'}
              strokeWidth={hoveredSegment === 'hips' ? "4" : "3"}
              className="cursor-pointer"
              onMouseEnter={() => handleSegmentHover('hips')}
              onMouseLeave={() => handleSegmentHover(null)}
              onClick={() => handleSegmentClick('hips')}
            />
            
            {/* Labels */}
            {hoveredSegment === 'ridges' && (
              <g>
                <rect x="170" y="90" width="60" height="20" fill="white" stroke="#dc2626" rx="4"/>
                <text x="200" y="102" textAnchor="middle" fontSize="12" fill="#dc2626" fontWeight="bold">
                  Ridges: 26 LF
                </text>
              </g>
            )}
            
            {hoveredSegment === 'hips' && (
              <g>
                <rect x="120" y="130" width="60" height="20" fill="white" stroke="#dc2626" rx="4"/>
                <text x="150" y="142" textAnchor="middle" fontSize="12" fill="#dc2626" fontWeight="bold">
                  Hips: 93 LF
                </text>
              </g>
            )}
            
            {/* Default Labels */}
            {!hoveredSegment && (
              <g>
                <text x="200" y="105" textAnchor="middle" fontSize="11" fill="#0ea5e9" fontWeight="medium">
                  Ridge: 26 LF
                </text>
                <text x="125" y="135" textAnchor="middle" fontSize="11" fill="#059669" fontWeight="medium">
                  Hip: 93 LF
                </text>
                <text x="275" y="135" textAnchor="middle" fontSize="11" fill="#059669" fontWeight="medium">
                  Hip
                </text>
              </g>
            )}
          </svg>
          
          {/* Total Summary */}
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-800 font-medium">Total Required Coverage:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-900">119 LF</span>
                <button 
                  onClick={() => {
                    setActiveTab(documents.find(d => d.fileType === 'roof_report')?.id || '');
                    setCurrentPage(2);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  View source
                </button>
              </div>
            </div>
            <div className="text-xs text-red-600 mt-1">
              Ridges (26 LF) + Hips (93 LF) = 119 LF total
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Evidence Chips Component
  const EvidenceChips = () => {
    if (evidenceChips.length === 0) return null;

    const handleChipClick = (chip: EvidenceChip) => {
      const targetDoc = documents.find(d => d.fileType === chip.docType);
      if (targetDoc) {
        setActiveTab(targetDoc.id);
        setCurrentPage(chip.page);
      }
    };

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-zinc-900 mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Evidence Stack
          <Badge variant="outline" className="text-xs">
            {evidenceChips.length} items
          </Badge>
        </h4>
        
        <div className="space-y-2">
          {evidenceChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900 group-hover:text-blue-900">
                  {chip.label}
                </div>
                <div className="text-xs text-zinc-500 group-hover:text-blue-600">
                  {chip.location}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 group-hover:text-blue-900">
                  {chip.value}
                </span>
                <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-blue-600" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced document highlights
  const getHighlights = (rule: string | null): DocumentHighlight[] => {
    if (!rule) return [];
    
    const highlightMap = {
      ridge_cap: [
        {
          type: 'line-item' as const,
          description: 'Hip/Ridge cap - Standard profile',
          page: 4,
          relevance: 'high' as const,
          location: 'Line 3b',
          value: '6.00 LF @ $42.90 = $257.40',
          issue: true
        },
        {
          type: 'measurement' as const,
          description: 'Total Ridges/Hips: 119 ft',
          page: 2,
          relevance: 'high' as const,
          location: 'EagleView Report',
          value: 'Ridges: 26 ft, Hips: 93 ft'
        }
      ]
    };
    
    return highlightMap[rule as keyof typeof highlightMap] || [];
  };

  const highlights = getHighlights(selectedRule);

  const getDocumentInfo = (doc: DocumentData) => {
    if (doc.fileType === 'estimate') {
      return {
        shortName: 'Insurance Estimate',
        icon: Receipt,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      };
    } else {
      return {
        shortName: 'EagleView Report',
        icon: Home,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
      };
    }
  };

  // Mock PDF content with enhanced highlighting
  const MockPDFPage = ({ pageNumber, docType }: { pageNumber: number, docType: string }) => (
    <div 
      className="border rounded-lg bg-white shadow-sm mx-auto relative"
      style={{ 
        width: `${Math.min(800 * (zoom / 100), 1000)}px`,
        height: `${Math.min(1000 * (zoom / 100), 1200)}px`,
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center'
      }}
    >
      <div className="p-8 h-full overflow-hidden">
        <div className="space-y-4">
          <div className="text-center border-b pb-4">
            <h3 className="text-xl font-bold">
              {docType === 'estimate' ? 'ALLSTATE INSURANCE ESTIMATE' : 'EAGLEVIEW ROOF REPORT'}
            </h3>
            <p className="text-muted-foreground">Page {pageNumber} of {totalPages}</p>
            {docType === 'estimate' && (
              <p className="text-sm text-zinc-500">Claim #0760901231 • John Smith</p>
            )}
          </div>
          
          {/* Enhanced content with better evidence highlighting */}
          {docType === 'estimate' && pageNumber === 4 && (
            <div className="space-y-3">
              <h4 className="font-medium">ROOFING MATERIALS</h4>
              <div className="space-y-2 text-sm">
                {/* Ridge Cap Line with Enhanced Highlighting */}
                <div className={`border rounded relative transition-all ${
                  selectedRule === 'ridge_cap' || highlightedLocation?.includes('Line 3b')
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200 shadow-md' 
                    : 'border-zinc-200'
                }`}>
                  <div className="p-3">
                    <div className="flex justify-between text-zinc-600">
                      <span>3a. Remove Hip/Ridge cap - Standard</span>
                      <span>6.00 LF</span>
                    </div>
                    <div className="flex justify-between font-medium mt-1">
                      <span>3b. Hip/Ridge cap - Standard profile</span>
                      <span>6.00 LF @ $42.90 = $257.40</span>
                    </div>
                  </div>
                  
                  {(selectedRule === 'ridge_cap' || highlightedLocation?.includes('Line 3b')) && (
                    <>
                      <div className="absolute -right-2 -top-2">
                        <div className="bg-red-500 text-white rounded-full p-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                        </div>
                      </div>
                      
                      <div className="p-3 bg-red-100 border-t border-red-200 text-xs text-red-700">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          <div>
                            <div className="font-medium">AI Analysis: Critical Shortage</div>
                            <div className="mt-1">Only 6 LF specified vs 119 LF needed (113 LF shortage)</div>
                            <div className="mt-1 font-medium">Missing: 113 LF × $4.50 = $508.50</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Other line items */}
                <div className="flex justify-between p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span>2. Laminated - comp. shingle rfg</span>
                  <span>69 EA @ $22.39 = $1,544.91</span>
                </div>
              </div>
            </div>
          )}
          
          {docType === 'roof_report' && pageNumber === 2 && (
            <div className="space-y-3">
              <h4 className="font-medium">EAGLEVIEW MEASUREMENTS</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                    <span>Total Roof Area:</span>
                    <span>2,450 SF</span>
                  </div>
                  <div className="flex justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                    <span>Total Eaves:</span>
                    <span>180 LF</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {/* Enhanced Ridge/Hip highlighting */}
                  <div className={`border rounded transition-all ${
                    selectedRule === 'ridge_cap' || highlightedLocation?.includes('Section 3')
                      ? 'border-red-300 bg-red-50 ring-2 ring-red-200 shadow-md' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="p-3">
                      <div className="flex justify-between font-medium">
                        <span>Total Ridges/Hips:</span>
                        <span>119 LF</span>
                      </div>
                    </div>
                    {(selectedRule === 'ridge_cap' || highlightedLocation?.includes('Section 3')) && (
                      <div className="p-3 bg-red-100 border-t border-red-200 text-xs text-red-700">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>• Ridges:</span>
                            <span className="font-medium">26 LF</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Hips:</span>
                            <span className="font-medium">93 LF</span>
                          </div>
                          <div className="border-t border-red-300 pt-1 mt-2">
                            <div className="font-medium text-red-800">vs Estimate: only 6 LF specified!</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Auto-switch to relevant document based on rule
  useEffect(() => {
    if (selectedRule === 'ridge_cap') {
      // Start with roof report to show measurements
      const reportDoc = documents.find(doc => doc.fileType === 'roof_report');
      if (reportDoc) {
        setActiveTab(reportDoc.id);
        setCurrentPage(2);
      }
    }
  }, [selectedRule, documents]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Document Evidence</h3>
              {selectedRule && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedRule.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} analysis • Interactive evidence viewer
                </p>
              )}
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-full">
        <div className="px-6">
          {/* Interactive Roof Diagram */}
          <RoofDiagram />
          
          {/* Evidence Chips */}
          <EvidenceChips />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Document Tabs */}
          <div className="px-6 pb-4">
            <TabsList className="grid w-full grid-cols-2 h-12">
              {documents.map((doc) => {
                const docInfo = getDocumentInfo(doc);
                const DocIcon = docInfo.icon;
                
                return (
                  <TabsTrigger 
                    key={doc.id} 
                    value={doc.id} 
                    className="flex items-center gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded ${docInfo.bgColor}`}>
                      <DocIcon className={`h-3.5 w-3.5 ${docInfo.color}`} />
                    </div>
                    <span className="text-sm font-medium">{docInfo.shortName}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Document Content */}
          {documents.map((doc) => (
            <TabsContent key={doc.id} value={doc.id} className="flex-1 flex flex-col mt-0">
              {/* Controls */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                    disabled={zoom <= 50}
                    className="h-8"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 w-12 text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                    className="h-8"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 p-6 bg-gray-100 overflow-auto">
                <MockPDFPage pageNumber={currentPage} docType={doc.fileType} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}