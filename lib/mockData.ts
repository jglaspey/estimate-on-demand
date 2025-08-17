// Types
export interface JobData {
  id: string;
  customerName: string;
  propertyAddress: string;
  insuranceCarrier: string;
  claimNumber: string;
  dateOfLoss: string;
  adjusterId?: string;
  adjusterName?: string;
  claimRep?: string;
  estimator?: string;
  policyNumber: string;
  totalEstimateValue: number;
  status: 'uploading' | 'extracting' | 'analyzing' | 'reviewing' | 'complete';
  createdAt: string;
  updatedAt: string;
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
  confidence: number;
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

// Mock Data
export const mockJobData: JobData = {
  id: 'job-8723',
  customerName: 'John Smith',
  propertyAddress: '123 Main Street, Dallas, TX 75201',
  insuranceCarrier: 'Allstate Insurance',
  claimNumber: '0760901231',
  dateOfLoss: '2024-01-15',
  adjusterId: 'ADJ-5847',
  adjusterName: 'Sarah Thompson',
  estimator: 'Sarah Thompson',
  policyNumber: 'POL-123456789',
  totalEstimateValue: 18750,
  status: 'reviewing',
  createdAt: '2024-02-01T08:00:00Z',
  updatedAt: '2024-02-01T14:30:00Z',
};

// Updated Jill Leger data for Encompass estimate
export const mockJobDataJill: JobData = {
  id: 'job-9156',
  customerName: 'Jill Leger',
  propertyAddress: '456 Oak Avenue, Houston, TX 77002',
  insuranceCarrier: 'Encompass Insurance',
  claimNumber: '0892103457',
  dateOfLoss: '2024-02-10',
  adjusterId: 'ADJ-6132',
  adjusterName: 'Mike Rodriguez',
  estimator: 'Mike Rodriguez',
  policyNumber: 'POL-987654321',
  totalEstimateValue: 24500,
  status: 'complete',
  createdAt: '2024-02-15T09:30:00Z',
  updatedAt: '2024-02-18T16:45:00Z',
};

export const mockRoofMeasurements: RoofMeasurements = {
  totalSquares: 24.5,
  roofArea: 2450,
  ridgeLength: 26, // From EagleView report
  hipsLength: 93, // From EagleView report
  totalRidgeHip: 119, // Total from EagleView
  eavesLength: 180,
  rakesLength: 120,
  pitch: '6/12',
  soffitDepth: '24"',
  wallThickness: '6"',
  // Additional fields for JobDetailsCard compatibility
  totalRoofArea: 2450,
  numberOfSquares: 24.5,
  predominantPitch: '6/12',
  numberOfStories: 2,
  totalEaves: 180,
  totalRakes: 120,
  totalRidges: 26,
  totalValleys: 15,
};

// Roof measurements for Jill Leger (Encompass)
export const mockRoofMeasurementsJill: RoofMeasurements = {
  totalSquares: 36.33,
  roofArea: 3633,
  ridgeLength: 19.64, // From Encompass roof report
  hipsLength: 298.39, // From Encompass roof report
  totalRidgeHip: 298, // Total from EagleView (rounded)
  eavesLength: 220,
  rakesLength: 140,
  pitch: '5/12',
  soffitDepth: '30"',
  wallThickness: '6"',
  // Additional fields for JobDetailsCard compatibility
  totalRoofArea: 3633,
  numberOfSquares: 36.33,
  predominantPitch: '5/12',
  numberOfStories: 2,
  totalEaves: 220,
  totalRakes: 140,
  totalRidges: 19.64,
  totalValleys: 20,
};

export const mockDocuments: DocumentData[] = [
  {
    id: 'doc-estimate-001',
    fileName: 'Allstate_Estimate_0760901231.pdf',
    fileType: 'estimate',
    uploadDate: '2024-02-01T08:00:00Z',
    pageCount: 6,
  },
  {
    id: 'doc-report-001',
    fileName: 'EagleView_Roof_Report.pdf',
    fileType: 'roof_report',
    uploadDate: '2024-02-01T08:15:00Z',
    pageCount: 12,
  },
];

// John Smith (Allstate) - Critical shortage scenario
export const mockRuleAnalysis: RuleAnalysisResult[] = [
  {
    ruleName: 'ridge_cap',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.95,
    reasoning:
      'Critical shortage detected: Estimate includes only 6 LF of ridge cap while EagleView report documents 119 ft total (26 ft ridges + 93 ft hips). Material type (Standard profile) is correct but quantity needs adjustment.',
    costImpact: 489.6, // 113 LF × $4.50 - current amount
    estimateQuantity: '6 LF',
    requiredQuantity: '119 LF',
    variance: '-113 LF',
    varianceType: 'shortage',
    materialStatus: 'compliant',
    currentSpecification: {
      code: 'RFG RIDGC',
      description: 'Hip/Ridge cap - Standard profile',
      quantity: '6.00 LF',
      rate: '$42.90/LF',
      total: '$257.40',
    },
  },
  {
    ruleName: 'starter_strip',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.88,
    reasoning:
      'Universal starter strip required but not properly specified. Current estimate notes "Include eave starter course: Yes (included in waste)" but this does not account for the specific universal starter strip product required for laminate shingles.',
    costImpact: 513.0, // 180 LF × $2.85
  },
  {
    ruleName: 'drip_edge',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.82,
    reasoning:
      'Insufficient edge flashing coverage. Estimate includes drip edge for rake edges only (120 LF) but missing gutter apron required for eave edges (180 LF). Different components needed for different roof edges.',
    costImpact: 765.0, // 180 LF × $4.25
  },
  {
    ruleName: 'ice_water_barrier',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.91,
    reasoning:
      'Insufficient ice & water barrier coverage per IRC R905.1.2. Estimate includes 800 SF but calculation based on roof measurements requires 1,167 SF (180 LF eaves × 60.4" width ÷ 12). Shortage of 367 SF.',
    costImpact: 678.95, // 367 SF × $1.85
  },
];

// Jill Leger (Encompass) - Adequate coverage scenario
export const mockRuleAnalysisJill: RuleAnalysisResult[] = [
  {
    ruleName: 'ridge_cap',
    status: 'COMPLIANT',
    confidence: 0.95,
    reasoning:
      'Ridge cap coverage verified as adequate. Estimate includes 318 LF while measurements show 298 LF required. The 7% overage provides appropriate waste factor for installation.',
    costImpact: 0,
    estimateQuantity: '318 LF',
    requiredQuantity: '298 LF',
    variance: '+20 LF',
    varianceType: 'adequate',
    materialStatus: 'compliant',
    currentSpecification: {
      code: 'RFG RIDGC',
      description: 'Hip/Ridge cap - Standard profile',
      quantity: '318.03 LF',
      rate: '$7.15/LF',
      total: '$2,398.98',
    },
  },
  {
    ruleName: 'starter_strip',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.91,
    reasoning: 'Universal starter strip required but not properly specified.',
    costImpact: 627.0, // 220 LF × $2.85
  },
  {
    ruleName: 'drip_edge',
    status: 'COMPLIANT',
    confidence: 0.94,
    reasoning: 'Proper edge flashing coverage specified for all roof edges.',
    costImpact: 0,
  },
  {
    ruleName: 'ice_water_barrier',
    status: 'SUPPLEMENT_NEEDED',
    confidence: 0.89,
    reasoning: 'Insufficient ice & water barrier coverage per IRC R905.1.2.',
    costImpact: 892.5, // Additional coverage needed
  },
];

// Dashboard job summaries
export const mockJobSummaries: JobSummary[] = [
  {
    id: 'job-8723',
    customerName: 'John Smith',
    propertyAddress: '123 Main Street, Dallas, TX 75201',
    insuranceCarrier: 'Allstate Insurance',
    supplementCount: 4, // All 4 rules need supplements
    totalSupplementValue: 2446.55, // Sum of all supplement costs
    status: 'reviewing',
    createdAt: '2024-02-01T08:00:00Z',
  },
  {
    id: 'job-9156',
    customerName: 'Jill Leger',
    propertyAddress: '456 Oak Avenue, Houston, TX 77002',
    insuranceCarrier: 'Encompass Insurance', // Updated to Encompass
    supplementCount: 2, // Only 2 rules need supplements (ridge cap is compliant)
    totalSupplementValue: 1519.5, // Sum of supplement costs
    status: 'complete',
    createdAt: '2024-02-15T09:30:00Z',
  },
];

// Function to get job data by ID
export const getJobDataById = (jobId: string) => {
  switch (jobId) {
    case 'job-8723':
      return {
        jobData: mockJobData,
        roofMeasurements: mockRoofMeasurements,
        ruleAnalysis: mockRuleAnalysis,
      };
    case 'job-9156':
      return {
        jobData: mockJobDataJill,
        roofMeasurements: mockRoofMeasurementsJill,
        ruleAnalysis: mockRuleAnalysisJill,
      };
    default:
      return null;
  }
};
