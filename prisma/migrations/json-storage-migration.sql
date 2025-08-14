-- JSON Storage Migration
-- This migration updates the DocumentPage table to use JSON storage instead of markdown

-- Step 1: Create a backup column for existing data
ALTER TABLE document_pages ADD COLUMN markdownText_backup TEXT;

-- Step 2: Backup existing markdown data
UPDATE document_pages SET markdownText_backup = markdownText WHERE markdownText IS NOT NULL;

-- Step 3: Drop the old markdownText column
ALTER TABLE document_pages DROP COLUMN markdownText;

-- Step 4: Add the new JSON columns
ALTER TABLE document_pages ADD COLUMN extractedContent JSONB;
ALTER TABLE document_pages ADD COLUMN rawText TEXT;

-- Step 5: Migrate existing data to new format (basic structure)
UPDATE document_pages 
SET extractedContent = json_build_object(
  'priority_fields', json_build_object(),
  'sections', json_build_object(),
  'business_rule_fields', json_build_object(),
  'processing_metadata', json_build_object(
    'extraction_method', 'migrated',
    'legacy_content', markdownText_backup
  )
),
rawText = markdownText_backup
WHERE markdownText_backup IS NOT NULL;

-- Step 6: Create JSON indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_document_pages_extracted_content ON document_pages USING GIN (extractedContent);
CREATE INDEX IF NOT EXISTS idx_document_pages_priority_fields ON document_pages USING GIN ((extractedContent->'priority_fields'));
CREATE INDEX IF NOT EXISTS idx_document_pages_business_rules ON document_pages USING GIN ((extractedContent->'business_rule_fields'));

-- Step 7: Clean up backup column (optional - keep for safety)
-- ALTER TABLE document_pages DROP COLUMN markdownText_backup;

-- Update any existing references in code to use the new JSON structure
COMMENT ON COLUMN document_pages.extractedContent IS 'Structured JSON data with priority_fields, sections, business_rule_fields, and coordinates';
COMMENT ON COLUMN document_pages.rawText IS 'Plain text fallback for full-text search operations';