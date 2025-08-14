-- Add Phase 1 extraction metadata fields to Job table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS extraction_confidence VARCHAR(10), -- 'high', 'medium', 'low'
ADD COLUMN IF NOT EXISTS extraction_rate INTEGER, -- percentage 0-100
ADD COLUMN IF NOT EXISTS phase1_processing_time INTEGER; -- milliseconds