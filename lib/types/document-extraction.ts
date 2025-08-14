/**
 * TypeScript types for JSON-based document extraction
 */

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldWithCoordinates<T = string> {
  value: T;
  confidence: number;
  coordinates?: Coordinates;
  source_page?: number;
}

export interface PriorityFields {
  customer_name?: FieldWithCoordinates;
  property_address?: FieldWithCoordinates;
  claim_number?: FieldWithCoordinates;
  policy_number?: FieldWithCoordinates;
  date_of_loss?: FieldWithCoordinates;
  carrier?: FieldWithCoordinates;
  claim_rep?: FieldWithCoordinates;
  estimator?: FieldWithCoordinates;
  original_estimate?: FieldWithCoordinates<number>;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  coordinates?: Coordinates;
  confidence: number;
}

export interface MeasurementField {
  value: number;
  unit?: string;
  coordinates?: Coordinates;
  confidence: number;
}

export interface DocumentSections {
  header?: {
    customer_info?: {
      name?: FieldWithCoordinates;
      address?: FieldWithCoordinates;
      phone?: FieldWithCoordinates;
      email?: FieldWithCoordinates;
    };
    claim_info?: {
      claim_number?: FieldWithCoordinates;
      policy_number?: FieldWithCoordinates;
      date_of_loss?: FieldWithCoordinates;
      carrier?: FieldWithCoordinates;
      claim_rep?: FieldWithCoordinates;
      estimator?: FieldWithCoordinates;
    };
  };
  line_items?: LineItem[];
  measurements?: {
    total_area?: MeasurementField;
    squares?: MeasurementField;
    stories?: MeasurementField;
    rake_length?: MeasurementField;
    eave_length?: MeasurementField;
    ridge_hip_length?: MeasurementField;
    valley_length?: MeasurementField;
    roof_slope?: FieldWithCoordinates;
    roof_material?: FieldWithCoordinates;
  };
  totals?: {
    subtotal?: FieldWithCoordinates<number>;
    tax?: FieldWithCoordinates<number>;
    total?: FieldWithCoordinates<number>;
    coordinates?: Coordinates;
  };
}

export interface BusinessRuleField {
  found: boolean;
  items?: LineItem[];
  evidence_pages: number[];
  coordinates?: Coordinates[];
  recommendation?: 'compliant' | 'supplement_needed' | 'review_required';
  confidence: number;
}

export interface BusinessRuleFields {
  hip_ridge_cap?: BusinessRuleField;
  starter_strip?: BusinessRuleField;
  drip_edge?: BusinessRuleField;
  gutter_apron?: BusinessRuleField;
  ice_water_barrier?: BusinessRuleField;
}

export interface ProcessingMetadata {
  extraction_method: string;
  model_version: string;
  processing_time_ms: number;
  total_pages: number;
  document_type: 'estimate' | 'roof_report' | 'unknown';
  language?: string;
  legacy_content?: string; // For migrated data
}

export interface ExtractedContent {
  priority_fields: PriorityFields;
  sections: DocumentSections;
  business_rule_fields: BusinessRuleFields;
  processing_metadata: ProcessingMetadata;
}

// Database model types
export interface DocumentPageWithJSON {
  id: string;
  documentId: string;
  jobId: string;
  pageNumber: number;
  extractedContent: ExtractedContent;
  rawText?: string;
  wordCount: number;
  extractedAt: Date;
  extractionMethod: string;
  confidence?: number;
  width?: number;
  height?: number;
  imageCount: number;
}

// API response types
export interface QuickExtractionResponse {
  jobId: string;
  priority_fields: PriorityFields;
  processing_time_ms: number;
  pages_processed: number;
  confidence: number;
}

export interface FullExtractionResponse {
  jobId: string;
  document_pages: DocumentPageWithJSON[];
  total_pages: number;
  processing_time_ms: number;
  business_rules_ready: boolean;
}