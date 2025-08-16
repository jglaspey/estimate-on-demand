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
  keywords: RegExp
): ExtractorInputPage[] {
  const matches = pages.filter(p => keywords.test(p.rawText || ''));
  if (matches.length > 0) return matches.slice(0, 5);
  return pages.slice(0, 3); // small default context
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

  const sys = `Extract only ${category} line items from the estimate text. Return strict JSON array 'items'. Each item: {category, code?, description, quantity{value,unit}?, unitPrice?, totalPrice?, sourcePages[], confidence}. ${promptHint}`;
  const resp = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
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
    /(drip\s*edge|DRIP\s*EDGE|RFG\s*DRIP)/i
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
    /(gutter\s*apron|gutter\s*flashing|eave\s*flashing|apron\s*flashing|counter\s*flashing\s*-?\s*apron|RFG\s*GUTTER\s*APRON)/i
  );
  return callClaude(
    'gutter_apron',
    relevant,
    'Include only eaves location; do not confuse with gutter guards.'
  );
}

export async function extractIceWaterItems(
  pages: ExtractorInputPage[]
): Promise<ExtractorResult> {
  const relevant = selectRelevantPages(
    pages,
    /(ice\s*&?\s*water|I&W|self\s*-?\s*adhering|RFG\s*IWS|ice\s*and\s*water)/i
  );
  return callClaude(
    'ice_water',
    relevant,
    'Report coverage if shown; include page evidence.'
  );
}
