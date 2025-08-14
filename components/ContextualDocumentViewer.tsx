import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
  Home,
  AlertTriangle,
  Calculator,
  ExternalLink
} from 'lucide-react';

interface DocumentData {
  id: string;
  fileName: string;
  fileType: 'estimate' | 'roof_report';
  uploadDate: string;
  pageCount: number;
}

interface ContextualDocumentViewerProps {
  documents: DocumentData[];
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
}

export function ContextualDocumentViewer({ documents, selectedRule }: ContextualDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState(documents[0]?.id || '');
  const [_hoveredItem, setHoveredItem] = useState<string | null>(null);
  const totalPages = 6; // Updated to match real estimate

  // Enhanced highlighting data based on real document analysis
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
      ],
      starter_strip: [
        {
          type: 'note' as const,
          description: 'Include eave starter course: Yes',
          page: 4,
          relevance: 'high' as const,
          location: 'Options section',
          value: '(included in waste)',
          issue: true
        },
        {
          type: 'measurement' as const,
          description: 'Total Eaves: 180 LF',
          page: 2,
          relevance: 'high' as const,
          location: 'Roof Report',
          value: 'Requires universal starter strip'
        }
      ],
      drip_edge: [
        {
          type: 'line-item' as const,
          description: 'Drip edge',
          page: 4,
          relevance: 'high' as const,
          location: 'Line 8',
          value: '120 LF @ $3.50 = $420.00'
        },
        {
          type: 'measurement' as const,
          description: 'Missing: Gutter apron for eaves',
          page: 4,
          relevance: 'high' as const,
          location: 'Missing line item',
          value: '180 LF needed',
          issue: true
        }
      ],
      ice_water_barrier: [
        {
          type: 'line-item' as const,
          description: 'Ice & water barrier',
          page: 4,
          relevance: 'high' as const,
          location: 'Line 12',
          value: '800 SF @ $1.85 = $1,480.00',
          issue: true
        },
        {
          type: 'calculation' as const,
          description: 'IRC R905.1.2 requirement calculation',
          page: 2,
          relevance: 'high' as const,
          location: 'Cross-reference',
          value: '180 LF × 60.4&quot; ÷ 12 = 1,167 SF required'
        }
      ]
    };
    
    return highlightMap[rule as keyof typeof highlightMap] || [];
  };

  const highlights = getHighlights(selectedRule);

  const getDocumentInfo = (doc: DocumentData) => {
    if (doc.fileType === 'estimate') {
      return {
        shortName: 'Estimate',
        icon: Receipt,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      };
    } else {
      return {
        shortName: 'Roof Report',
        icon: Home,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
      };
    }
  };

  // Mock PDF content with real-world data
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
      {/* Mock PDF Content */}
      <div className="p-8 h-full overflow-hidden">
        <div className="space-y-4">
          <div className="text-center border-b pb-4">
            <h3 className="text-xl font-bold">
              {docType === 'estimate' ? 'ALLSTATE INSURANCE ESTIMATE' : 'EAGLEVIEW ROOF REPORT'}
            </h3>
            <p className="text-muted-foreground">Page {pageNumber} of {totalPages}</p>
            {docType === 'estimate' && (
              <p className="text-sm text-zinc-500">Claim #0760901231 • Nicholas Boryca</p>
            )}
          </div>
          
          {/* Context-specific content */}
          {docType === 'estimate' && pageNumber === 4 && (
            <div className="space-y-3">
              <h4 className="font-medium">ROOFING MATERIALS</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2">
                  <span>1. Remove Laminated - comp. shingle rfg</span>
                  <span>69 EA</span>
                </div>
                
                <div className="flex justify-between p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span>2. Laminated - comp. shingle rfg</span>
                  <span>69 EA @ $22.39 = $1,544.91</span>
                </div>
                
                <div className={`border rounded relative ${
                  selectedRule === 'ridge_cap' ? 'border-red-300 bg-red-50 ring-2 ring-red-200' : 'border-zinc-200'
                }`}>
                  <div className="p-2">
                    <div className="flex justify-between">
                      <span>3a. Remove Hip/Ridge cap - Standard</span>
                      <span>6.00 LF</span>
                    </div>
                    <div 
                      className="flex justify-between font-medium mt-1"
                      onMouseEnter={() => setHoveredItem('ridge_cap_line')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span>3b. Hip/Ridge cap - Standard profile</span>
                      <span>6.00 LF @ $42.90 = $257.40</span>
                    </div>
                  </div>
                  {selectedRule === 'ridge_cap' && (
                    <div className="absolute -right-2 -top-2">
                      <div className="bg-red-500 text-white rounded-full p-1">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                  
                  {/* AI Analysis Overlay */}
                  {selectedRule === 'ridge_cap' && (
                    <div className="p-2 bg-red-100 border-t border-red-200 text-xs text-red-700">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="font-medium">AI Analysis:</span>
                        <span>Only 6 LF specified vs 119 LF needed (113 LF shortage)</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between p-2">
                  <span>4a. Remove Roof vent - turbine type</span>
                  <span>2.00 EA</span>
                </div>
                
                <div className={`flex justify-between p-2 border rounded ${
                  selectedRule === 'starter_strip' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-zinc-200'
                }`}>
                  <span>OPTIONS: Include eave starter course: Yes</span>
                  <span className="text-amber-700">(included in waste)</span>
                  {selectedRule === 'starter_strip' && (
                    <div className="absolute -right-2 -top-2">
                      <div className="bg-amber-500 text-white rounded-full p-1">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`flex justify-between p-2 border rounded ${
                  selectedRule === 'drip_edge' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-zinc-200'
                }`}>
                  <span>8. Drip edge</span>
                  <span>120 LF @ $3.50 = $420.00</span>
                </div>
                
                <div className={`flex justify-between p-2 border rounded ${
                  selectedRule === 'ice_water_barrier' ? 'border-red-300 bg-red-50 ring-2 ring-red-200' : 'border-zinc-200'
                }`}>
                  <span>12. Ice & water barrier</span>
                  <span>800 SF @ $1.85 = $1,480.00</span>
                  {selectedRule === 'ice_water_barrier' && (
                    <div className="absolute -right-2 -top-2">
                      <div className="bg-red-500 text-white rounded-full p-1">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                    </div>
                  )}
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
                    <span>Squares:</span>
                    <span>24.5</span>
                  </div>
                  <div className={`flex justify-between p-2 border rounded ${
                    selectedRule === 'ice_water_barrier' ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <span>Predominant Pitch:</span>
                    <span>6/12</span>
                  </div>
                  <div className={`flex justify-between p-2 border rounded ${
                    selectedRule === 'ice_water_barrier' ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span>Soffit Depth:</span>
                    <span>24&quot;</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`flex justify-between p-2 border rounded ${
                    (selectedRule === 'starter_strip' || selectedRule === 'drip_edge' || selectedRule === 'ice_water_barrier') ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span>Total Eaves:</span>
                    <span>180 LF</span>
                  </div>
                  <div className={`flex justify-between p-2 border rounded ${
                    selectedRule === 'drip_edge' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span>Total Rakes:</span>
                    <span>120 LF</span>
                  </div>
                  <div className={`border rounded font-medium ${
                    selectedRule === 'ridge_cap' ? 'border-red-300 bg-red-50 ring-2 ring-red-200' : 'border-zinc-200'
                  }`}>
                    <div className="p-2">
                      <div className="flex justify-between">
                        <span>Total Ridges/Hips:</span>
                        <span>119 ft</span>
                      </div>
                    </div>
                    {selectedRule === 'ridge_cap' && (
                      <div className="p-2 bg-red-100 border-t border-red-200 text-xs text-red-700">
                        <div>• Ridges: 26 ft</div>
                        <div>• Hips: 93 ft</div>
                        <div className="font-medium mt-1">vs Estimate: only 6 LF specified!</div>
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
    if (selectedRule === 'ridge_cap' || selectedRule === 'starter_strip' || selectedRule === 'drip_edge') {
      const estimateDoc = documents.find(doc => doc.fileType === 'estimate');
      if (estimateDoc) {
        setActiveTab(estimateDoc.id);
        setCurrentPage(4); // Page with line items
      }
    } else if (selectedRule === 'ice_water_barrier') {
      const reportDoc = documents.find(doc => doc.fileType === 'roof_report');
      if (reportDoc) {
        setActiveTab(reportDoc.id);
        setCurrentPage(2); // Page with measurements
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
                  {selectedRule.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} context • Found on {highlights.length > 0 ? highlights[0].page : 'multiple'} page{highlights.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardTitle>
          
          {highlights.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{highlights.length}</span>
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">evidence items</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-full">
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

          {/* Cross-Reference Section for Ridge Cap */}
          {selectedRule === 'ridge_cap' && (
            <div className="px-6 py-4 border-b bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  📊 Measurement Comparison
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-2">From Estimate (Page 4):</div>
                  <div className="space-y-1 text-red-700 dark:text-red-300">
                    <div>• Ridge cap: 6.00 LF</div>
                    <div>• Type: Standard profile ✓</div>
                    <div>• Rate: $42.90/LF</div>
                  </div>
                </div>
                <div className="p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-2">From EagleView (Page 2):</div>
                  <div className="space-y-1 text-red-700 dark:text-red-300">
                    <div>• Total: 119 ft</div>
                    <div>• Ridges: 26 ft, Hips: 93 ft</div>
                    <div>• Shortage: 113 LF</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-red-200 border border-red-300 rounded text-center dark:bg-red-800 dark:border-red-700">
                <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                  💰 Supplement Impact: 113 LF × $4.50 = $508.50
                </span>
              </div>
            </div>
          )}

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
                  
                  {highlights.length > 0 && (
                    <>
                      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                      <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                        <ExternalLink className="h-3 w-3" />
                        Jump to evidence
                      </button>
                    </>
                  )}
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
                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                  <Button variant="outline" size="sm" className="h-8">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8">
                    <Download className="h-4 w-4" />
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