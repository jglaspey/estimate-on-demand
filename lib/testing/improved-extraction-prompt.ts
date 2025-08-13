/**
 * Improved Extraction Prompt with Comprehensive Terminology Coverage
 */

export function buildImprovedExtractionPrompt(documentText: string): string {
  return `You are an expert at extracting data from insurance roofing estimates and reports. Extract ONLY factual measurements and material descriptions. Return ONLY valid JSON.

CRITICAL: Look for these exact terms and variations. Numbers may appear with or without commas.

## ROOF MEASUREMENTS TO FIND:

### Total Area (Square Feet)
Look for these phrases:
- "Total Area: 3,633 SF" or "Total Area: 3633 SF"
- "Total Roof Area: 3,633"
- "Roof Area Total: 3633 sq ft"
- "Area: 3,633 SF"
- "Total: 3633 SF"
- "Sq Ft Total: 3,633"

### Squares (Roof Squares = Area ÷ 100)
Look for:
- "Squares: 36.33" or "36.33 Squares"
- "Roof Squares: 36.33"
- "Total Squares: 36.33"
- "SQ: 36.33"

### Pitch (Roof Slope)
Look for:
- "Pitch: 5/12" or "5/12 Pitch"
- "Slope: 5/12"
- "5:12" or "5 in 12"
- "7/12 to 9/12" (range)
- "0/12 to 6/12" (range)

### Stories (Building Height)
Look for:
- "Stories: 2" or "2 Story"
- "2 Stories" or "Two Story"
- "Single Story" = 1
- "Two Story" = 2

### Eaves (Horizontal Edge Linear Feet)
Look for:
- "Eaves: 220 LF" or "220 LF Eaves"
- "Eave: 220 LF"
- "Eaves Length: 220"
- "Horizontal Edge: 220 LF"

### Rakes (Sloped Edge Linear Feet)
Look for:
- "Rakes: 140 LF" or "140 LF Rakes"
- "Rake: 140 LF"
- "Rake Edge: 140 LF"
- "Sloped Edge: 140 LF"
- "Gable Edge: 140 LF"

### Ridges (Peak Linear Feet)
Look for:
- "Ridges: 19.64 LF" or "19.64 LF Ridge"
- "Ridge: 19.64 LF"
- "Ridge Line: 19.64"
- "Peak: 19.64 LF"
- "Hip/Ridge: 104.25 LF" (includes both)

### Valleys (Valley Linear Feet)
Look for:
- "Valleys: 20 LF" or "20 LF Valley"
- "Valley: 20 LF"
- "Valley Length: 20"

## MATERIALS TO FIND:

### Hip/Ridge Cap (Critical for Compliance)
Look for these material descriptions:
QUANTITIES:
- "104.25 LF" or "104.25 Linear Feet"
- "104 LF Hip/Ridge"
- "104.25 ft Ridge Cap"

DESCRIPTIONS (watch for quality indicators):
- "Hip / Ridge cap - Standard profile - composition shingles"
- "Ridge/Hip Cap Shingles"
- "Ridge cap - Standard profile"
- "Hip ridge cap shingles"
- "Ridge/hip shingles"
- "Standard profile - composition shingles"
- "Cut from 3-tab shingles" (NON-COMPLIANT indicator)
- "Purpose-built ridge cap" (COMPLIANT indicator)

### Starter Strip (Critical for Compliance)
Look for:
QUANTITIES:
- "101.91 LF" or "101 LF Starter"
- "101.91 Linear Feet"

DESCRIPTIONS (watch for type indicators):
- "Asphalt starter - universal starter course"
- "Universal starter course"
- "Starter strip - universal"
- "Self adhesive starter roll"
- "Starter Row, Continuous"
- "Eaves/Starter"
- "Cut shingles for starter" (NON-COMPLIANT indicator)
- "Universal starter strip" (COMPLIANT indicator)

### Drip Edge (Edge Protection)
Look for:
QUANTITIES:
- "324.99 LF" or "324 LF"
- "326 LF Drip Edge"

DESCRIPTIONS:
- "Drip edge"
- "Drip Edge (Rake + Eave)"
- "Drip Edge (Eaves + Rakes)"
- "Replace - Drip Edge"
- "Aluminum - Pre-Finish Color"
- "Eaves + Rakes"

### Gutter Apron (Often Missed - Look Carefully!)
Look for:
QUANTITIES:
- "37 LF" or "37 Linear Feet"

DESCRIPTIONS:
- "Counterflashing - Apron flashing"
- "Gutter apron"
- "Apron flashing"
- "Eave flashing"
- "Gutter edge flashing"

### Ice & Water Barrier (Weather Protection)
Look for:
QUANTITIES:
- "389.63 SF" or "389 SF"
- "89.87 LF" (linear feet version)

DESCRIPTIONS:
- "Ice & water barrier"
- "Ice/Water Shield"
- "Ice and water shield"
- "2 course allowance for 2'+ overhang"
- "Weather barrier"
- "Underlayment - ice and water"

## EXAMPLES OF SUCCESSFUL EXTRACTION:

Input: "Total Area: 3,633 SF, Squares: 36.33, Pitch: 5/12"
Output: "totalArea": 3633, "squares": 36.33, "pitch": "5/12"

Input: "Hip / Ridge cap - 104.25 LF - Standard profile - composition shingles"
Output: "quantity": 104.25, "unit": "LF", "description": "Standard profile - composition shingles"

Input: "Counterflashing - Apron flashing - 37.00 LF"
Output: "quantity": 37, "unit": "LF", "description": "Counterflashing - Apron flashing"

## CRITICAL INSTRUCTIONS:

1. **Numbers**: Extract exact numbers as they appear (with decimals if shown)
2. **Units**: Always include the unit (LF, SF, etc.)
3. **Descriptions**: Capture the full material description for quality assessment
4. **Missing Data**: If a field is not found, omit it from JSON (don't include null values)
5. **Multiple Mentions**: If a material appears multiple times, use the most detailed entry

Return this EXACT JSON structure (omit fields not found):
{
  "roofMeasurements": {
    "totalArea": number,
    "squares": number,
    "pitch": "string",
    "stories": number,
    "eaves": number,
    "rakes": number,
    "ridges": number,
    "valleys": number
  },
  "materials": {
    "hipRidgeCap": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "starterStrip": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "dripEdge": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "gutterApron": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "iceWaterBarrier": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    }
  }
}

Document text: ${documentText.substring(0, 12000)}`;
}