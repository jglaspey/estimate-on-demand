import Anthropic from '@anthropic-ai/sdk';

export interface VerificationInput {
  extracted: Record<string, unknown>;
  pages: Array<{
    pageNumber: number;
    rawText: string;
    imageDataUris?: string[];
  }>;
}

export interface VerificationItem {
  field: string;
  extractedValue: unknown;
  observedValue?: unknown;
  confidence: number; // 0..1
  pages: number[];
  notes?: string;
}

export interface VerificationResult {
  verifications: VerificationItem[];
  corrections: Record<string, unknown>;
}

export async function verifyExtractionAgainstDocuments(
  input: VerificationInput
): Promise<VerificationResult> {
  const result: VerificationResult = { verifications: [], corrections: {} };

  if (!process.env.ANTHROPIC_API_KEY) return result; // skip if no key

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Keep context tiny: just critical totals and measurements for now
  const fieldsToCheck = [
    'rcv',
    'acv',
    'netClaim',
    'priceList',
    'estimateCompletedAt',
  ];
  const extractedSubset: Record<string, unknown> = {};
  for (const f of fieldsToCheck)
    extractedSubset[f] =
      (input.extracted as Record<string, unknown>)[f] ?? null;

  const chosen = input.pages
    .filter(p =>
      /RCV|ACV|Net\s*Claim|Price\s*List|Date\s*Est|Completed/i.test(
        p.rawText || ''
      )
    )
    .slice(0, 3)
    .map(
      p => `--- Page ${p.pageNumber} ---\n${(p.rawText || '').slice(0, 3000)}`
    )
    .join('\n');

  const prompt = `Given the following extracted values and the source text segments, verify each field and return JSON array "verifications" and object "corrections". Only include corrections where the observed value clearly differs.\n\nExtracted: ${JSON.stringify(extractedSubset)}\n\nSource:\n${chosen}`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = resp.content[0];
    if (content.type === 'text') {
      let text = content.text.trim();
      const fence = text.match(/```json[\s\S]*?```/);
      if (fence) text = fence[0].replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text) as VerificationResult;
      return parsed;
    }
  } catch {
    // Keep empty result on error
  }

  return result;
}
