export interface RoofMeasurements {
  ridgeLength?: number;
  hipLength?: number;
  eaveLength?: number;
  rakeLength?: number;
  valleyLength?: number;
  squares?: number;
  pitch?: string; // e.g., 6/12
  stories?: number;
  totalRidgeHip?: number;
}

export function parseRoofMeasurementsFromText(
  pages: Array<{ pageNumber: number; rawText: string }>
): RoofMeasurements {
  const text = pages.map(p => p.rawText || '').join('\n');

  const num = (m: RegExpMatchArray | null): number | undefined => {
    if (!m) return undefined;
    const v = parseFloat(m[1].replace(/,/g, ''));
    return Number.isFinite(v) ? v : undefined;
  };

  const ridgeLength =
    num(text.match(/Ridges?\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/ridge\s*(?:length)?\s*[:=]?\s*([0-9,.]+)/i));
  // Capture combined total before hips to avoid mis-assigning it
  const totalRidgeHip =
    num(text.match(/Total\s+Ridges\s*\/\s*Hips\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/Ridges\s*\/\s*Hips\s*\$?\s*=\s*([0-9,.]+)/i));
  // Only match standalone "Hips = <num>", not the combined label "Ridges/Hips = <num>"
  const hipLength =
    num(text.match(/(?<!Ridges\s*\/\s*)Hips?\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/\bhip\s*(?:length)?\s*[:=]?\s*([0-9,.]+)/i));
  const eaveLength =
    num(text.match(/Eaves?(?:\/Starter)?'?\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/eave\s*(?:length)?\s*[:=]?\s*([0-9,.]+)/i));
  const rakeLength =
    num(text.match(/Rakes?\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/rake\s*(?:length)?\s*[:=]?\s*([0-9,.]+)/i));
  const valleyLength =
    num(text.match(/Valleys?\s*\$?\s*=\s*([0-9,.]+)/i)) ||
    num(text.match(/valley\s*(?:length)?\s*[:=]?\s*([0-9,.]+)/i));
  const squares =
    num(text.match(/Squares\s*\*\s*\|?\s*([0-9,.]+)/i)) ||
    num(text.match(/Number\s*of\s*Squares\s*\|\s*([0-9,.]+)/i));
  const pitchPred =
    text.match(/Predominant\s+Pitch\s*\$?\s*=\s*(\d+\s*\/\s*\d+)/i) ||
    text.match(/predominant\s+pitch\s+is\s+(\d+\s*\/\s*\d+)/i);
  const pitchMatch =
    pitchPred || text.match(/(\d+\s*\/\s*\d+)\s*(?:pitch|slope)?/i);
  const storiesMatch =
    text.match(/Number\s+of\s+Stories\s*<=?\s*(\d+)/i) ||
    text.match(/stories?\s*[:=]?\s*(\d+)/i);

  return {
    ridgeLength,
    hipLength,
    eaveLength,
    rakeLength,
    valleyLength,
    squares,
    pitch: pitchMatch ? pitchMatch[1].replace(/\s+/g, '') : undefined,
    stories: storiesMatch ? parseInt(storiesMatch[1], 10) : undefined,
    totalRidgeHip,
  };
}
