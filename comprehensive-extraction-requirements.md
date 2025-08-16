# Comprehensive Data Extraction Requirements

## General Information (Both Documents)

### From Roof Report:
- Property address
- Report date
- Report ID/number
- Total roof area (square feet)
- Number of squares (area ÷ 100)
- Number of roof facets
- Number of stories
- Predominant pitch (e.g., 5/12)

### From Insurance Estimate:
- Insured name
- Property address
- Claim number
- Policy number
- Insurance company name
- Adjuster name
- Date of loss
- Date estimate completed
- Estimate total (RCV and ACV)

## Measurements from Roof Report

### Critical Linear Measurements:
- **Total Eaves**: Linear feet (needed for gutter apron & starter strip)
- **Total Rakes**: Linear feet (needed for drip edge)
- **Total Ridges/Hips**: Linear feet (needed for ridge cap)
- **Total Valleys**: Linear feet (needed for ice & water calculation)

### Additional Measurements:
- Total perimeter
- Flashing lengths
- Step flashing lengths

## Line Items from Insurance Estimate

### Business Rule 1 - Hip/Ridge Cap Items:
**Search for these patterns:**
- "ridge cap", "hip cap", "ridge/hip", "hip/ridge"
- "RFG RIDGC", "RFG RIDGH", "RFG RIDGCP"
- Look for descriptions containing:
  - "cut from 3 tab"
  - "cut from three tab"
  - "purpose built"
  - "purpose-built"
  - "standard profile"
  - "high profile"
- Extract: Code, Description, Quantity (LF), Unit Price

### Business Rule 2 - Starter Strip Items:
**Search for these patterns:**
- "starter", "starter course", "starter strip", "starter row"
- "RFG STARTER", "RFG ASTR", "RFG STRTR"
- Look for descriptions containing:
  - "universal starter"
  - "peel and stick"
  - "asphalt starter"
- **Also search estimate notes/options for:**
  - "starter course: Yes"
  - "included in waste"
  - "Bundle Rounding"
- Extract: Code, Description, Quantity (LF), Unit Price

### Business Rule 3 - Drip Edge & Gutter Apron Items:
**Search for these patterns:**
- "drip edge", "drip-edge", "dripedge"
- "gutter apron", "gutter-apron"
- "drip edge/gutter apron" (combined item)
- "RFG DRIP", "RFG DRPEDG", "RFG GTRPN"
- Extract: Code, Description, Quantity (LF), Unit Price

### Business Rule 4 - Ice & Water Barrier Items:
**Search for these patterns:**
- "ice and water", "ice & water", "I&W"
- "ice barrier", "water barrier"
- "ice shield", "water shield"
- "IWS", "RFG IWS", "RFG ICEWTR"
- "self-adhering", "self adhering"
- Extract: Code, Description, Quantity (SF), Unit Price

## Additional Context for Calculations

### Roof Type Determination:
**From shingle line items, determine if:**
- Laminate/architectural/dimensional shingles
- 3-tab shingles
- Other roofing types (metal, tile, etc.)

### For Ice & Water Calculations:
- Soffit depth (default: 24 inches if not found)
- Wall thickness (default: 6 inches if not found)
- Building heated/unheated status (assume heated unless noted)

## Special Considerations

### Multiple Line Item Handling:
- Same material may appear multiple times (e.g., different roof sections)
- Need to sum quantities for same material type
- Watch for partial quantities that need to be combined

### Terminology Variations by Carrier:
- State Farm may use different codes/descriptions
- Encompass may combine items differently
- Some carriers include items in "Additional Charges" section

### Notes and Special Instructions:
- Extract any notes about included/excluded items
- Look for "Options" sections that affect calculations
- Check for high roof/steep charges that affect labor

## Output Format Requirements

Each extracted item should include:
```json
{
  "source": "estimate|roof_report",
  "category": "ridge_cap|starter|drip_edge|gutter_apron|ice_water|other",
  "code": "RFG XXXX",
  "description": "Full text description",
  "quantity": 123.45,
  "unit": "LF|SF|SQ|EA",
  "unit_price": 12.34,
  "total_price": 1524.33,
  "location": "page X, line Y",
  "confidence": 0.95
}
```

## Validation Checks

1. **Quantity Reasonableness**:
   - Eaves + Rakes should ≈ Total Perimeter
   - Ridge/Hip length should be < Total Perimeter
   - Ice & Water SF should be reasonable vs roof area

2. **Unit Consistency**:
   - Ridge cap, starter, drip edge: Linear Feet (LF)
   - Ice & water barrier: Square Feet (SF)
   - Shingles: Squares (SQ) or Bundles

3. **Missing Data Flags**:
   - Flag if key measurements missing from roof report
   - Flag if no roofing line items in estimate
   - Flag if address doesn't match between documents