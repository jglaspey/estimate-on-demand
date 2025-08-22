import Anthropic from '@anthropic-ai/sdk';

export type LineItemCategory =
  | 'ridge_cap'
  | 'starter'
  | 'drip_edge'
  | 'gutter_apron'
  | 'ice_water';

export interface Quantity {
  value: number;
  unit: 'LF' | 'SF' | 'EA' | string;
}

export interface LineItem {
  category: LineItemCategory;
  code?: string;
  description: string;
  quantity?: Quantity;
  unitPrice?: number;
  totalPrice?: number;
  pageIndex?: number;
  sourcePages?: number[];
  confidence?: number; // 0..1
  // Ridge cap specific (only for category === 'ridge_cap')
  ridgeCapQuality?: 'purpose-built' | 'high-profile' | 'cut-from-3tab' | null;
}

export interface ExtractorInputPage {
  pageNumber: number;
  rawText: string;
}

export interface ExtractorResult {
  items: LineItem[];
}

function selectRelevantPages(
  pages: ExtractorInputPage[],
  primary: RegExp,
  secondary?: RegExp,
  maxPages: number = 6
): ExtractorInputPage[] {
  const uniqByPage = (arr: ExtractorInputPage[]) => {
    const seen = new Set<number>();
    const result: ExtractorInputPage[] = [];
    for (const p of arr) {
      if (!seen.has(p.pageNumber)) {
        seen.add(p.pageNumber);
        result.push(p);
      }
    }
    return result;
  };

  const prim = pages.filter(p => primary.test(p.rawText || ''));
  if (prim.length > 0) return prim.slice(0, maxPages);
  if (secondary) {
    const sec = pages.filter(p => secondary.test(p.rawText || ''));
    if (sec.length > 0) return uniqByPage(sec).slice(0, maxPages);
  }
  // Fallback: take a few more pages to improve recall when keywords differ
  return pages.slice(0, Math.min(maxPages, 8));
}

async function callClaude(
  category: LineItemCategory,
  pages: ExtractorInputPage[],
  promptHint: string
): Promise<ExtractorResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { items: [] };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const textBlocks = pages
    .map(
      p => `--- Page ${p.pageNumber} ---\n${(p.rawText || '').slice(0, 4000)}`
    )
    .join('\n');

  const sys = `Extract only ${category} line items from the estimate text. Return strict JSON array 'items'. Each item: {category, code?, description, quantity{value,unit}?, unitPrice?, totalPrice?, sourcePages[], confidence${category === 'ridge_cap' ? ', ridgeCapQuality' : ''}}. 

CRITICAL PAGE NUMBER RULES:
- sourcePages[] must contain the EXACT page number(s) where the line item appears
- If an item appears at the TOP of a page, use THAT page number, not the previous page
- Look for page footers like "Page: X" to confirm the correct page
- If a line item spans pages, include ALL pages in sourcePages[]
- Page numbers in the text (like "Page: 8") indicate where content ABOVE that footer belongs

${promptHint}`;
  const resp = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL_EXTRACTOR || 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    temperature: 0,
    messages: [{ role: 'user', content: `${sys}\n\n${textBlocks}` }],
  });
  const content = resp.content[0];
  if (content.type !== 'text') return { items: [] };
  let txt = content.text.trim();
  const fence = txt.match(/```json[\s\S]*?```/);
  if (fence) txt = fence[0].replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(txt) as ExtractorResult | LineItem[];
    if (Array.isArray(parsed)) return { items: parsed };
    return parsed;
  } catch {
    return { items: [] };
  }
}

export async function extractRidgeCapItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(\bridge\s*cap\b|\bhip\s*cap\b|ridge\s*\/\s*hip|hip\s*\/\s*ridge|RFG\s*RIDG[A-Z]*)/i,
    /(\bridge\b.*\bcap\b|\bcap\b.*\bridge\b)/i
  );
  return callClaude(
    'ridge_cap',
    relevant,
    'For each ridge/hip cap item, include ridgeCapQuality as one of "purpose-built", "high-profile", or "cut-from-3tab". CRITICAL: Include the EXACT page number(s) in sourcePages[] where each item appears. If "13. Hip / Ridge cap" appears after "Page: 7" footer but before "Page: 8" footer, it belongs to page 8.'
  );
}

export async function extractStarterItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(starter\s*(row|course)?|universal\s*starter|peel\s*and\s*stick|STRTR|RFG\s*STARTER|included\s*in\s*waste|Options\s*:)/i
  );
  return callClaude(
    'starter',
    relevant,
    'Detect universal vs cut-from-3tab; include evidence pages.'
  );
}

export async function extractDripEdgeItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(\bdrip\s*edge\b|RFG\s*DRIP)/i,
    /(drip\s*metal|eave\s*drip|drip\s*cap)/i
  );
  return callClaude(
    'drip_edge',
    relevant,
    'Differentiate from gutter apron; include only rakes for drip edge.'
  );
}

export async function extractGutterApronItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(gutter\s*apron|gutter\s*flashing|eave\s*flashing|apron\s*flashing|counter\s*flashing\s*[\-–—]?\s*apron|counter\s*flashing[^\n]{0,40}?apron|apron[^\n]{0,40}?counter\s*flashing|RFG\s*GUTTER\s*APRON)/i,
    /(\beave\s*(metal|trim|apron|flashing)\b|starter\s*metal|eaves?\s*apron|apron\b)/i,
    8
  );
  return callClaude(
    'gutter_apron',
    relevant,
    'Include only eaves location (gutter apron/eave flashing). Do not include drip edge (rakes), gutter guards, or valley/step flashing.'
  );
}

export async function extractIceWaterItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(ice\s*&?\s*water|ice\s*and\s*water|ice\s*-?\s*and\s*-?\s*water\s*shield|ice\s*&\s*water\s*shield|RFG\s*IWS|IWS\b|I&W|ice\s*&?\s*water\s*barrier)/i,
    /(self\s*-?\s*adher(?:ed|ing)|self\s*-?\s*sealing|underlayment\s*(membrane)?|waterproof(?:ing)?\s*membrane)/i,
    8
  );
  return callClaude(
    'ice_water',
    relevant,
    'Identify ice & water barrier/shield (self-adhered membrane). Report SF and page evidence. Exclude felt/roofing paper and synthetic underlayment.'
  );
}
