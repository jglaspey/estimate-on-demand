export type DocType = 'estimate' | 'roof_report';

export interface EvidenceRef {
  id: string;
  label: string;
  value?: string | number | null;
  docType: DocType;
  page: number;
  textMatch?: string; // regex/snippet to highlight in extracted view
  score?: number; // optional confidence score
}

export interface EvidenceQuery {
  docType: DocType;
  patterns?: string[]; // regex strings
  mustInclude?: string[]; // literals to include
  numberWithUnit?: { unit: 'LF' | 'SF' | 'EA'; min?: number; max?: number };
  preferPages?: number[];
}
