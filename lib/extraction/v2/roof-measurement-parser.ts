export interface RoofMeasurements {
  ridgeLength?: number;
  hipLength?: number;
  eaveLength?: number;
  rakeLength?: number;
  valleyLength?: number;
  squares?: number;
  pitch?: string; // e.g., 6/12
  stories?: number;
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

  const ridgeLength = num(
    text.match(/ridge\s*(?:length)?\s*[:=]?\s*([0-9,.]+)\s*(?:lf|ft|feet)?/i)
  );
  const hipLength = num(
    text.match(/hip\s*(?:length)?\s*[:=]?\s*([0-9,.]+)\s*(?:lf|ft|feet)?/i)
  );
  const eaveLength = num(
    text.match(/eave\s*(?:length)?\s*[:=]?\s*([0-9,.]+)\s*(?:lf|ft|feet)?/i)
  );
  const rakeLength = num(
    text.match(/rake\s*(?:length)?\s*[:=]?\s*([0-9,.]+)\s*(?:lf|ft|feet)?/i)
  );
  const valleyLength = num(
    text.match(/valley\s*(?:length)?\s*[:=]?\s*([0-9,.]+)\s*(?:lf|ft|feet)?/i)
  );
  const squares =
    num(text.match(/total\s*squares?\s*[:=]?\s*([0-9,.]+)/i)) ||
    num(text.match(/\b([0-9,.]+)\s*squares?\b/i));
  const pitchMatch = text.match(/(\d+\s*\/\s*\d+)\s*(?:pitch|slope)?/i);
  const storiesMatch = text.match(/stories?\s*[:=]?\s*(\d+)/i);

  return {
    ridgeLength,
    hipLength,
    eaveLength,
    rakeLength,
    valleyLength,
    squares,
    pitch: pitchMatch ? pitchMatch[1].replace(/\s+/g, '') : undefined,
    stories: storiesMatch ? parseInt(storiesMatch[1], 10) : undefined,
  };
}
