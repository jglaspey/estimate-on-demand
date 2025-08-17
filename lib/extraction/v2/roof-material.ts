export interface RoofMaterialDetection {
  material?: string;
  confidence: number; // 0..1
  sourcePages?: number[];
}

/**
 * Parse likely roof material from estimate text pages using simple heuristics.
 * Falls back to undefined when not confidently found.
 */
export function extractRoofMaterialFromPages(
  pages: Array<{ pageNumber: number; rawText: string }>
): RoofMaterialDetection {
  const text = pages
    .map(p => `\n[Page ${p.pageNumber}]\n${p.rawText || ''}`)
    .join('\n')
    .toLowerCase();

  const candidates: Array<{ key: string; label: string }> = [
    { key: 'laminated - comp. shingle', label: 'Composition Shingles' },
    { key: 'laminated - comp', label: 'Composition Shingles' },
    { key: 'composition shingle', label: 'Composition Shingles' },
    { key: 'asphalt shingle', label: 'Asphalt Shingles' },
    { key: 'architectural shingle', label: 'Architectural Shingles' },
    { key: '3-tab shingle', label: '3-Tab Shingles' },
    { key: 'metal roof', label: 'Metal' },
    { key: 'standing seam', label: 'Metal' },
    { key: 'tile roof', label: 'Tile' },
    { key: 'cedar shake', label: 'Cedar Shake' },
  ];

  for (const c of candidates) {
    const idx = text.indexOf(c.key);
    if (idx !== -1) {
      // crude page inference: find last "[Page X]" marker occurring before the match
      const upto = text.substring(0, idx);
      const match = upto.match(/\[page\s+(\d+)\]/gi);
      const last = match?.at(-1);
      const page = last ? Number((last.match(/\d+/) || [])[0]) : undefined;
      return {
        material: c.label,
        confidence: 0.8,
        sourcePages: page ? [page] : undefined,
      };
    }
  }

  return { confidence: 0 };
}
