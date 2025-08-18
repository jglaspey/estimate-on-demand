# Jump-to-Evidence (Left → Right auto-jump + highlight)

## Objective
When a user clicks an evidence link on the left, the right viewer:
- Switches to the correct document tab (Estimate or Roof Report)
- Navigates to the target page
- Scrolls to and highlights the matching text in Extracted view
- PDF view: page-jump now; highlight later (pdf.js or overlays)

## Data
- Documents + page text: `GET /api/jobs/:jobId/documents`
- v2 extraction hints: `GET /api/jobs/:jobId/extract-v2`

## UI Contract
EvidenceJump:
- `docType`: 'estimate' | 'roof_report'
- `page`: number
- `rule?`: string
- `location?`: string
- `textMatch?`: string (regex/snippet)

## Implementation
1) Viewer imperative API
   - `forwardRef + useImperativeHandle` in `EnhancedDocumentViewer`
   - Expose `jumpToEvidence(target)`
   - Set active tab, `viewMode='extracted'`, `currentPage`, and store `pendingTarget`

2) Highlight + Scroll (Extracted)
   - Resolve regex: `textMatch` → rule highlight map → fallback
   - Inject `<mark id="evidence-target">` around first match via `rehypeRaw`
   - Smooth-scroll to the mark after render

3) Wire Left Cards
   - Parent holds `viewerRef` and calls `jumpToEvidence` on click
   - Parse page from strings like "page-4-line-3b"

4) Styling
   - Global `mark#evidence-target` style for light/dark

## Acceptance
- Left clicks change tab/page and center a visible highlight
- Graceful fallback when no match (page jump only)
- No regressions to viewer controls or auto-jump rules
