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
  // Enhanced fallback: for critical items like drip edge, check more pages
  // This ensures we don't miss items due to text parsing differences
  console.log(
    `⚠️ No pages matched primary/secondary patterns, using fallback (${Math.min(maxPages + 2, pages.length)} pages)`
  );
  return pages.slice(0, Math.min(maxPages + 2, pages.length));
}

async function callClaude(
  category: LineItemCategory,
  pages: ExtractorInputPage[],
  promptHint: string
): Promise<ExtractorResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`❌ No ANTHROPIC_API_KEY found for ${category} extraction`);
    return { items: [] };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelUsed =
    process.env.ANTHROPIC_MODEL_EXTRACTOR || 'claude-3-5-haiku-20241022';
  console.log(`🤖 Using model ${modelUsed} for ${category} extraction`);
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

${
  category === 'drip_edge' || category === 'gutter_apron'
    ? `STRICT EXTRACTION RULES FOR EDGE PROTECTION:
- Extract ONLY real estimate line items with prices (must appear in a line-item table with QUANTITY and UNIT PRICE columns)
- Do NOT infer or calculate items from roof-report measurements (e.g., "Perimeter", "Eaves Flashing")
- Each returned item MUST include: description, quantity{value,unit}, sourcePages[], and either unitPrice or totalPrice
- Prefer items that include a code (e.g., RFG DRIP, DE). If no code is present, ensure the page clearly shows it as a billed line item
- If nothing meets these criteria, return []
`
    : ''
}
${promptHint}`;
  try {
    const resp = await anthropic.messages.create({
      model: modelUsed,
      max_tokens: 500,
      temperature: 0,
      messages: [{ role: 'user', content: `${sys}\n\n${textBlocks}` }],
    });
    const content = resp.content[0];
    if (content.type !== 'text') {
      console.error(`❌ Non-text response for ${category}`);
      return { items: [] };
    }
    let txt = content.text.trim();
    const fence = txt.match(/```json[\s\S]*?```/);
    if (fence) txt = fence[0].replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(txt) as ExtractorResult | LineItem[];
      const result = Array.isArray(parsed) ? { items: parsed } : parsed;

      // Additional hardening for edge-protection categories: drop non-line-items
      if (category === 'drip_edge' || category === 'gutter_apron') {
        const estimateLikePages = new Set(
          pages
            .filter(p =>
              /\bQUANTITY\b|\bUNIT\s*PRICE\b|\bRCV\b|\bACV\b/i.test(
                p.rawText || ''
              )
            )
            .map(p => p.pageNumber)
        );

        const before = result.items.length;
        result.items = (result.items || []).filter(it => {
          const hasQty =
            !!it.quantity &&
            typeof it.quantity.value === 'number' &&
            it.quantity.value > 0;
          const hasPrice =
            (typeof it.unitPrice === 'number' && it.unitPrice > 0) ||
            (typeof it.totalPrice === 'number' && it.totalPrice > 0);
          const hasPages =
            Array.isArray(it.sourcePages) && it.sourcePages.length > 0;
          const fromEstimatePages =
            hasPages &&
            it.sourcePages!.every(
              n => estimateLikePages.size === 0 || estimateLikePages.has(n)
            );
          return hasQty && hasPages && fromEstimatePages && hasPrice;
        });
        const removed = before - result.items.length;
        if (removed > 0) {
          console.warn(
            `🧹 Filtered out ${removed} non-line-items for ${category}`
          );
        }
      }

      console.log(
        `✅ ${category} extraction found ${result.items.length} items`
      );
      if (category === 'drip_edge' && result.items.length === 0) {
        console.warn(
          `⚠️ No drip edge items found. Raw response: ${txt.slice(0, 200)}...`
        );
      }
      return result;
    } catch (parseErr) {
      console.error(
        `❌ Failed to parse ${category} response: ${parseErr}. Attempting recovery. Raw: ${txt.slice(0, 200)}...`
      );
      // Recovery: try to extract first JSON array or object from the text
      const arrayMatch = txt.match(/\[[\s\S]*\]/);
      const objectMatch = txt.match(/\{[\s\S]*\}/);
      const candidate =
        (arrayMatch && arrayMatch[0]) || (objectMatch && objectMatch[0]) || '';
      if (candidate) {
        try {
          const recovered = JSON.parse(candidate) as
            | ExtractorResult
            | LineItem[];
          const result = Array.isArray(recovered)
            ? { items: recovered }
            : recovered;
          console.log(
            `🛠️ Recovered ${category} JSON with ${result.items.length} items`
          );
          return result;
        } catch (recoverErr) {
          console.error(
            `❌ Recovery parse failed for ${category}: ${recoverErr}`
          );
        }
      }
      return { items: [] };
    }
  } catch (apiErr) {
    console.error(`❌ API error for ${category}: ${apiErr}`);
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
    // Enhanced primary pattern - more variations
    /(\bdrip[\s\-]*edge\b|RFG[\s\-]*DRIP|drip[\s\-]*metal|eave[\s\-]*drip|drip[\s\-]*cap|D\.E\.|DE\b)/i,
    // Enhanced secondary pattern - catch more variations
    /(metal[\s\-]*edge|rake[\s\-]*edge|eave[\s\-]*edge|aluminum[\s\-]*drip|steel[\s\-]*drip|edge[\s\-]*metal|edge[\s\-]*flashing)/i,
    8 // Increase pages to check for better coverage
  );

  // Log what pages we're checking
  console.log(`🔍 Drip edge extraction: checking ${relevant.length} pages`);
  relevant.forEach(p => {
    const preview = (p.rawText || '').slice(0, 200).replace(/\n/g, ' ');
    console.log(`   Page ${p.pageNumber}: ${preview}...`);
  });

  return callClaude(
    'drip_edge',
    relevant,
    'Extract ONLY actual drip edge LINE ITEMS from insurance estimates with codes, descriptions, quantities and prices. Do NOT extract measurement labels from roof reports. Look for "drip edge", "drip-edge", "D.E.", "drip metal", etc. Each item MUST be from an estimate with actual pricing, NOT just a measurement label.'
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
    'Extract ONLY actual gutter apron LINE ITEMS from insurance estimates with quantities and prices. Do NOT extract measurement labels like "Eaves Flashing" from roof reports. Look for items with codes, descriptions, quantities, and unit prices. Exclude drip edge (rakes), gutter guards, or valley/step flashing.'
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
