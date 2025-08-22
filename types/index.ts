// Types
export interface JobData {
  id: string;
  customerName: string;
  propertyAddress: string;
  insuranceCarrier: string;
  claimNumber: string;
  dateOfLoss: string;
  adjusterId: string;
  adjusterName: string;
  policyNumber: string;
  totalEstimateValue: number;
  status:
    | 'uploading'
    | 'extracting'
    | 'analyzing'
    | 'processing'
    | 'reviewing'
    | 'complete';
  createdAt: string;
  updatedAt: string;
  claimRep?: string;
  estimator?: string;
}

export interface RoofMeasurements {
  // Primary measurements for overview display
  totalArea: number;
  totalSquares: number;
  pitch: string;
  stories: number;
  eavesLength: number;
  rakesLength: number;
  ridgesLength: number;
  valleysLength: number;

  // Additional detailed measurements
  roofArea: number;
  ridgeLength: number;
  hipsLength: number;
  totalRidgeHip: number;
  soffitDepth: string;
  wallThickness: string;

  // Additional fields for JobDetailsCard compatibility
  totalRoofArea: number;
  numberOfSquares: number;
  predominantPitch: string;
  numberOfStories: number;
  totalEaves: number;
  totalRakes: number;
  totalRidges: number;
  totalValleys: number;
}

export interface DocumentData {
  id: string;
  fileName: string;
  fileType: 'estimate' | 'roof_report';
  uploadDate: string;
  pageCount: number;
}

export interface RuleAnalysisResult {
  ruleName: string;
  status: 'COMPLIANT' | 'SUPPLEMENT_NEEDED' | 'INSUFFICIENT_DATA';
  reasoning: string;
  costImpact: number;
  userDecision?: 'accepted' | 'rejected' | 'modified';
  userNotes?: string;
  // Additional fields for universal design
  estimateQuantity?: string;
  requiredQuantity?: string;
  variance?: string;
  varianceType?: 'shortage' | 'adequate' | 'excess';
  materialStatus?: 'compliant' | 'non-compliant';
  currentSpecification?: {
    code: string;
    description: string;
    quantity: string;
    rate: string;
    total: string;
  };
}

// Dashboard job summary interface
export interface JobSummary {
  id: string;
  customerName: string;
  propertyAddress: string;
  insuranceCarrier: string;
  supplementCount: number;
  totalSupplementValue: number;
  status: JobData['status'];
  createdAt: string;
}
