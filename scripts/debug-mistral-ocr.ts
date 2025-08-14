import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { Mistral } from '@mistralai/mistralai';

const OCR_URL = 'https://api.mistral.ai/v1/ocr';
const OCR_MODEL = 'mistral-ocr-latest';
const CHAT_MODEL = 'mistral-large-latest';

function summarize(text: string, len = 500): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, len);
}

function pageToText(page: any): string {
  if (!page) return '';
  return (
    page.markdown ||
    page.transcription ||
    page.text ||
    (page.content && (page.content.text || page.content)) ||
    page.ocr_text ||
    (Array.isArray(page.lines)
      ? page.lines.map((l: any) => l.text || l).join('\n')
      : '') ||
    ''
  );
}

async function callMistralOCR(filePath: string) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('Missing MISTRAL_API_KEY');

  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString('base64');

  const res = await fetch(OCR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${base64}`,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

function extractJson(content: any): any {
  const raw = Array.isArray(content)
    ? content
        .map((c: any) => (typeof c === 'string' ? c : c.text || ''))
        .join('')
    : (content ?? '');

  let s = String(raw).trim();
  // Strip code fences if present
  const fence = s.match(/```json[\s\S]*?```/i) || s.match(/```[\s\S]*?```/);
  if (fence) s = fence[0].replace(/```json|```/gi, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(s);
  } catch {}

  // Remove trailing commas
  try {
    return JSON.parse(s.replace(/,\s*([}\]])/g, '$1'));
  } catch {}

  // Balance braces and extract first JSON object
  const start = s.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = s.slice(start, i + 1);
          try {
            return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
          } catch {}
        }
      }
    }
  }
  throw new Error('Failed to parse JSON from chat response');
}

async function extractPriorityFields(text: string) {
  const key = process.env.MISTRAL_API_KEY;
  const mistral = new Mistral({ apiKey: key! });
  const prompt = `Return ONLY valid JSON (no markdown, no prose). Extract the following fields as {value, confidence}:\n- customer_name\n- property_address\n- claim_number\n- policy_number\n- date_of_loss\n- carrier\n- claim_rep\n- estimator\n- original_estimate (number)\n\nDocument text (truncated):\n${text.slice(0, 2000)}`;

  const resp = await mistral.chat.complete({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    responseFormat: { type: 'json_object' },
    maxTokens: 1200,
    temperature: 0,
  });

  return extractJson(resp.choices?.[0]?.message?.content);
}

async function main() {
  const input =
    process.argv[2] || path.join(process.cwd(), 'examples', 'boryca-est.pdf');
  console.log(`Testing Mistral OCR on: ${input}`);
  try {
    const ocr = await callMistralOCR(input);
    const pages = Array.isArray(ocr.pages) ? ocr.pages : [];
    console.log(`OCR OK. pages=${pages.length}`);
    if (pages.length) {
      const p1 = summarize(pageToText(pages[0]));
      const p2 = summarize(pageToText(pages[1] || {}));
      console.log(`Page1: ${p1.length} chars ->`, p1);
      console.log(`Page2: ${p2.length} chars ->`, p2);
      const allText = pages.map(pageToText).join('\n\n');
      const quick = await extractPriorityFields(allText);
      console.log('Priority fields:', JSON.stringify(quick, null, 2));
    } else {
      console.log(
        'No pages returned from OCR payload:',
        JSON.stringify(ocr, null, 2)
      );
    }
  } catch (err) {
    console.error('Mistral test failed:', err);
    process.exitCode = 1;
  }
}

main();
