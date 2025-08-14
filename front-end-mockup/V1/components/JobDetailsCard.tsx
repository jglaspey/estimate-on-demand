import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Edit2, Check, X, FileText, MapPin, Calendar, DollarSign } from 'lucide-react';
import { JobData, RoofMeasurements } from '../lib/mockData';

interface JobDetailsCardProps {
  jobData: JobData;
  roofMeasurements: RoofMeasurements;
  onUpdateField: (field: string, value: string | number) => void;
}

export function JobDetailsCard({ jobData, roofMeasurements, onUpdateField }: JobDetailsCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (field: string, currentValue: string | number) => {
    setEditingField(field);
    setEditValue(String(currentValue));
  };

  const handleSave = (field: string) => {
    onUpdateField(field, editValue);
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const EditableField = ({ 
    field, 
    value, 
    label, 
    type = 'text' 
  }: { 
    field: string; 
    value: string | number; 
    label: string; 
    type?: string; 
  }) => (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      {editingField === field ? (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => handleSave(field)}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between group">
          <span>{value}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(field, value)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  const getStatusBadge = (status: string | undefined) => {
    // Add null safety check
    if (!status) {
      return (
        <Badge className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
          Unknown
        </Badge>
      );
    }

    const statusConfig = {
      uploading: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
      extracting: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
      analyzing: { variant: 'secondary' as const, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
      reviewing: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
      complete: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return (
        <Badge className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
          {status}
        </Badge>
      );
    }

    return (
      <Badge className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Details
          </CardTitle>
          {getStatusBadge(jobData.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            field="customerName"
            value={jobData.customerName}
            label="Customer Name"
          />
          <EditableField
            field="adjusterName"
            value={jobData.adjusterName || jobData.adjusterId}
            label="Adjuster Name"
          />
        </div>

        {/* Property & Insurance Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Property Information</span>
          </div>
          
          <EditableField
            field="propertyAddress"
            value={jobData.propertyAddress}
            label="Property Address"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EditableField
              field="insuranceCarrier"
              value={jobData.insuranceCarrier}
              label="Insurance Carrier"
            />
            <EditableField
              field="claimNumber"
              value={jobData.claimNumber}
              label="Claim Number"
            />
            <EditableField
              field="policyNumber"
              value={jobData.policyNumber || 'Not provided'}
              label="Policy Number"
            />
          </div>
        </div>

        {/* Dates & Values */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Claim Information</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField
              field="dateOfLoss"
              value={jobData.dateOfLoss}
              label="Date of Loss"
              type="date"
            />
            <div className="space-y-2">
              <Label className="text-muted-foreground">Total Estimate Value</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>${jobData.totalEstimateValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roof Measurements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Roof Measurements</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Total Area</Label>
              <span>{(roofMeasurements.totalRoofArea || roofMeasurements.roofArea).toLocaleString()} SF</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Squares</Label>
              <span>{roofMeasurements.numberOfSquares || roofMeasurements.totalSquares}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Pitch</Label>
              <span>{roofMeasurements.predominantPitch || roofMeasurements.pitch}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Stories</Label>
              <span>{roofMeasurements.numberOfStories || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Eaves</Label>
              <span>{roofMeasurements.totalEaves || roofMeasurements.eavesLength} LF</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Rakes</Label>
              <span>{roofMeasurements.totalRakes || roofMeasurements.rakesLength} LF</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Ridges</Label>
              <span>{roofMeasurements.totalRidges || roofMeasurements.ridgeLength} LF</span>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Valleys</Label>
              <span>{roofMeasurements.totalValleys || 'N/A'} LF</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}