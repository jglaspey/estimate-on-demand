import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DocumentData } from '../lib/mockData';

interface DocumentViewerProps {
  documents: DocumentData[];
}

export function DocumentViewer({ documents }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const totalPages = 5; // Mock total pages

  const getDocumentTypeColor = (type: string) => {
    return type === 'estimate' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getDocumentTypeLabel = (type: string) => {
    return type === 'estimate' ? 'Insurance Estimate' : 'Roof Report';
  };

  // Mock PDF content - in real implementation, this would be PDF.js
  const MockPDFPage = ({ pageNumber, docType }: { pageNumber: number, docType: string }) => (
    <div 
      className="border rounded-lg bg-white shadow-sm mx-auto"
      style={{ 
        width: `${Math.min(800 * (zoom / 100), 1000)}px`,
        height: `${Math.min(1000 * (zoom / 100), 1200)}px`,
        transform: `scale(${zoom / 100})`
      }}
    >
      {/* Mock PDF Content */}
      <div className="p-8 h-full">
        <div className="space-y-4">
          <div className="text-center border-b pb-4">
            <h3 className="text-xl font-bold">
              {docType === 'estimate' ? 'INSURANCE ESTIMATE' : 'ROOF MEASUREMENT REPORT'}
            </h3>
            <p className="text-muted-foreground">Page {pageNumber} of {totalPages}</p>
          </div>
          
          {docType === 'estimate' && pageNumber === 2 && (
            <div className="space-y-3">
              <h4 className="font-medium">ROOFING MATERIALS</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-yellow-100 border border-yellow-300 rounded">
                  <span>RFG RIDGC - Hip / Ridge cap - cut from 3 tab - composition shingles</span>
                  <span>85 LF @ $3.25 = $276.25</span>
                </div>
                <div className="flex justify-between p-2">
                  <span>RFG SHIN - Composition shingles - laminate</span>
                  <span>25 SQ @ $185.50 = $4,637.50</span>
                </div>
                <div className="flex justify-between p-2 bg-red-100 border border-red-300 rounded">
                  <span>OPTIONS: Include eave starter course: Yes</span>
                  <span>(included in waste)</span>
                </div>
                <div className="flex justify-between p-2">
                  <span>RFG DRIP - Drip edge</span>
                  <span>120 LF @ $3.50 = $420.00</span>
                </div>
                <div className="flex justify-between p-2">
                  <span>RFG IWS - Ice & water barrier</span>
                  <span>1,200 SF @ $1.85 = $2,220.00</span>
                </div>
              </div>
            </div>
          )}
          
          {docType === 'roof_report' && pageNumber === 1 && (
            <div className="space-y-3">
              <h4 className="font-medium">ROOF MEASUREMENTS</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                    <span>Total Roof Area:</span>
                    <span>2,450 SF</span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Number of Squares:</span>
                    <span>24.5</span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Predominant Pitch:</span>
                    <span>6/12</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-green-50 border border-green-200 rounded">
                    <span>Total Eaves:</span>
                    <span>180 LF</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-50 border border-green-200 rounded">
                    <span>Total Rakes:</span>
                    <span>120 LF</span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Total Ridges:</span>
                    <span>85 LF</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Mock highlighted sections */}
          <div className="mt-8 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              📍 This section contains data referenced in the business rule analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Viewer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={documents[0]?.id} className="h-full">
          {/* Document Tabs */}
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              {documents.map((doc) => (
                <TabsTrigger key={doc.id} value={doc.id} className="flex items-center gap-2">
                  <Badge className={getDocumentTypeColor(doc.fileType)} variant="secondary">
                    {getDocumentTypeLabel(doc.fileType)}
                  </Badge>
                  <span className="truncate">{doc.fileName}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Document Content */}
          {documents.map((doc) => (
            <TabsContent key={doc.id} value={doc.id} className="mt-4 h-full">
              {/* Controls */}
              <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
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
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-16 text-center">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="p-6 bg-gray-100 min-h-[600px] overflow-auto">
                <MockPDFPage pageNumber={currentPage} docType={doc.fileType} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}