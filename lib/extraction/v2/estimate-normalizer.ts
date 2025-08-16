import Anthropic from '@anthropic-ai/sdk';

export interface PageText {
  pageNumber: number;
  rawText: string;
}

export interface NormalizedEstimateTotals {
  rcv?: number;
  acv?: number;
  netClaim?: number;
  priceList?: string;
  estimateCompletedAt?: string; // ISO date string
  confidence: number; // 0..1 aggregate
  sources: Array<{ field: string; pageNumber: number; text: string }>;
  usedLLM: boolean;
}

const moneyPattern =
  '(?:\\$\\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?|[0-9]+(?:\\.[0-9]{2})?)';

const regexes = {
  rcv: new RegExp(
    `(?:Replacement\\s*Cost\\s*Value|Replacement\\s*Cost|RCV)\\s*[:\\-]?\\s*${moneyPattern}`,
    'i'
  ),
  acv: new RegExp(
    `(?:Actual\\s*Cash\\s*Value|Actual\\s*Cash|ACV)\\s*[:\\-]?\\s*${moneyPattern}`,
    'i'
  ),
  netClaim: new RegExp(
    `(?:Net\\s*Claim(?:\\s*Amount)?|Total\\s*Net\\s*Claim)\\s*[:\\-]?\\s*${moneyPattern}`,
    'i'
  ),
  priceList: /Price\s*List\s*[:\-]?\s*([A-Za-z0-9\-_. ]{3,})/i,
  estimateCompletedAt:
    /Date\s*(?:Est\.?\s*Completed|Completed|of\s*Completion)\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
};

function toNumber(num?: string | null): number | undefined {
  if (!num) return undefined;
  const cleaned = num.replace(/[,\s]/g, '');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : undefined;
}

function toISODate(input?: string | null): string | undefined {
  if (!input) return undefined;
  const [m, d, y] = input.split(/[\/\-]/).map(s => parseInt(s, 10));
  if (!m || !d || !y) return undefined;
  const year = y < 100 ? 2000 + y : y;
  const dt = new Date(year, m - 1, d);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

function score(confParts: Array<boolean | number>): number {
  if (confParts.length === 0) return 0;
  const mapped = confParts.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
  return Math.max(
    0,
    Math.min(1, mapped.reduce((a, b) => a + b, 0) / confParts.length)
  );
}

export async function normalizeEstimateTotalsFromPages(
  pages: PageText[]
): Promise<NormalizedEstimateTotals> {
  const result: NormalizedEstimateTotals = {
    confidence: 0,
    sources: [],
    usedLLM: false,
  };

  // Deterministic regex-first pass
  for (const page of pages) {
    const text = page.rawText || '';
    const rcvM = text.match(regexes.rcv);
    if (!result.rcv && rcvM) {
      result.rcv = toNumber(rcvM[1]);
      result.sources.push({
        field: 'rcv',
        pageNumber: page.pageNumber,
        text: rcvM[0],
      });
    }
    const acvM = text.match(regexes.acv);
    if (!result.acv && acvM) {
      result.acv = toNumber(acvM[1]);
      result.sources.push({
        field: 'acv',
        pageNumber: page.pageNumber,
        text: acvM[0],
      });
    }
    const netM = text.match(regexes.netClaim);
    if (!result.netClaim && netM) {
      result.netClaim = toNumber(netM[1]);
      result.sources.push({
        field: 'netClaim',
        pageNumber: page.pageNumber,
        text: netM[0],
      });
    }
    const priceM = text.match(regexes.priceList);
    if (!result.priceList && priceM) {
      result.priceList = priceM[1].trim();
      result.sources.push({
        field: 'priceList',
        pageNumber: page.pageNumber,
        text: priceM[0],
      });
    }
    const dateM = text.match(regexes.estimateCompletedAt);
    if (!result.estimateCompletedAt && dateM) {
      const iso = toISODate(dateM[1]);
      if (iso) {
        result.estimateCompletedAt = iso;
        result.sources.push({
          field: 'estimateCompletedAt',
          pageNumber: page.pageNumber,
          text: dateM[0],
        });
      }
    }
  }

  // Confidence from deterministic coverage
  result.confidence = score([
    typeof result.rcv === 'number',
    typeof result.acv === 'number',
    typeof result.netClaim === 'number',
    !!result.priceList,
    !!result.estimateCompletedAt,
  ]);

  // Tiny LLM fallback only if needed and key is present
  const needLLM =
    (!result.rcv ||
      !result.acv ||
      !result.netClaim ||
      !result.priceList ||
      !result.estimateCompletedAt) &&
    !!process.env.ANTHROPIC_API_KEY;
  if (!needLLM) {
    return result;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Limit context: choose the first 2 pages and any page containing keywords
    const keywordPages = pages.filter(p =>
      /RCV|ACV|Net\s*Claim|Price\s*List|Date\s*Est|Completed/i.test(
        p.rawText || ''
      )
    );
    const chosen = (keywordPages.length > 0 ? keywordPages : pages.slice(0, 2))
      .map(
        p => `--- Page ${p.pageNumber} ---\n${(p.rawText || '').slice(0, 4000)}`
      )
      .join('\n');

    const prompt = `Extract ONLY the following fields from the estimate text and return strict JSON with keys: rcv, acv, netClaim, priceList, estimateCompletedAt (ISO date if possible). Use null when not found.\n\n${chosen}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      let text = content.text.trim();
      const fence = text.match(/```json[\s\S]*?```/);
      if (fence) {
        text = fence[0].replace(/```json|```/g, '').trim();
      }
      const json = JSON.parse(text) as Partial<NormalizedEstimateTotals> &
        Record<string, any>;
      if (!result.rcv && json.rcv != null)
        result.rcv =
          typeof json.rcv === 'string' ? toNumber(json.rcv) : json.rcv;
      if (!result.acv && json.acv != null)
        result.acv =
          typeof json.acv === 'string' ? toNumber(json.acv) : json.acv;
      if (!result.netClaim && json.netClaim != null)
        result.netClaim =
          typeof json.netClaim === 'string'
            ? toNumber(json.netClaim)
            : json.netClaim;
      if (!result.priceList && json.priceList)
        result.priceList = String(json.priceList);
      if (!result.estimateCompletedAt && json.estimateCompletedAt) {
        const iso = toISODate(String(json.estimateCompletedAt));
        if (iso) result.estimateCompletedAt = iso;
      }
      result.usedLLM = true;
      // Recompute confidence
      result.confidence = score([
        typeof result.rcv === 'number',
        typeof result.acv === 'number',
        typeof result.netClaim === 'number',
        !!result.priceList,
        !!result.estimateCompletedAt,
      ]);
    }
  } catch {
    // Swallow LLM errors; keep deterministic values
  }

  return result;
}
