import type { EvidenceQuery, EvidenceRef, DocType } from './types';

type PageRecord = { pageNumber: number; rawText: string | null };

export class EvidenceLocator {
  private readonly index: Record<DocType, PageRecord[]>;

  constructor(index: Record<DocType, PageRecord[]>) {
    this.index = index;
  }

  findFirst(query: EvidenceQuery, fallbackPage = 1): EvidenceRef | null {
    const pages = this.index[query.docType] || [];
    const patterns = (query.patterns || [])
      .map(p => {
        try {
          return new RegExp(p, 'i');
        } catch {
          return null;
        }
      })
      .filter(Boolean) as RegExp[];

    let best: EvidenceRef | null = null;
    let bestScore = -Infinity;

    for (const p of pages) {
      const text = p.rawText || '';
      let score = 0;

      if (query.preferPages?.includes(p.pageNumber)) score += 2;
      if (
        query.mustInclude?.every(s =>
          text.toLowerCase().includes(s.toLowerCase())
        )
      )
        score += 2;

      let matchedSnippet: string | undefined;
      for (const rx of patterns) {
        const m = text.match(rx);
        if (m) {
          matchedSnippet = rx.source;
          score += 3;
          break;
        }
      }

      if (query.numberWithUnit) {
        const unit = query.numberWithUnit.unit;
        const rx = new RegExp(`([\n\r\s:>])([\d.,]+)\s*${unit}`, 'i');
        const m = text.match(rx);
        if (m) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = {
          id: `${query.docType}-p${p.pageNumber}`,
          label: 'evidence',
          value: null,
          docType: query.docType,
          page: p.pageNumber,
          textMatch: matchedSnippet,
          score,
        };
      }
    }

    return (
      best || {
        id: `${query.docType}-p${fallbackPage}`,
        label: 'evidence',
        value: null,
        docType: query.docType,
        page: fallbackPage,
        score: 0,
      }
    );
  }
}
