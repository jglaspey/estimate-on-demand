export interface RoofMeasurements {
  eaveLength?: number; // linear feet
  rakeLength?: number; // linear feet
  ridgeLength?: number; // linear feet
  hipLength?: number; // linear feet
  valleyLength?: number; // linear feet
  squares?: number; // roofing squares
  pitch?: string; // e.g., "6/12"
}

export interface RequiredQuantities {
  requiredStarterLf?: number;
  requiredDripEdgeLf?: number;
  requiredIceWaterSf?: number;
}

function parsePitch(pitch?: string): number | undefined {
  if (!pitch) return undefined;
  const m = pitch.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return undefined;
  const rise = parseInt(m[1], 10);
  const run = parseInt(m[2], 10);
  if (!run) return undefined;
  return rise / run;
}

export function computeRequirements(
  meas: RoofMeasurements,
  opts?: { soffitInches?: number; wallThicknessInches?: number }
): RequiredQuantities {
  const soffit = opts?.soffitInches ?? 24; // default assumptions
  const wall = opts?.wallThicknessInches ?? 6;

  const requiredInchesFromEave = (() => {
    const slope = parsePitch(meas.pitch);
    // Simple baseline per doc: if slope known and >= 4/12 use 24" beyond inside warm wall; rough default ~60"
    if (typeof slope === 'number') {
      const base = 24; // inches beyond warm wall
      return base + soffit + wall; // inches
    }
    return 60; // conservative default inches
  })();

  const requiredIceWaterSf =
    typeof meas.eaveLength === 'number'
      ? meas.eaveLength * (requiredInchesFromEave / 12)
      : undefined;

  const requiredStarterLf =
    typeof meas.eaveLength === 'number' ? meas.eaveLength : undefined;
  const requiredDripEdgeLf =
    typeof meas.rakeLength === 'number' ? meas.rakeLength : undefined;

  return { requiredStarterLf, requiredDripEdgeLf, requiredIceWaterSf };
}
