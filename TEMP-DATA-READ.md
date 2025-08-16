# Complete Job Data Export
**Job ID:** cmedgnfsi0000sa5fuzx81et1
**Generated:** 2025-08-15T23:52:39.632Z
**Customer:** Evans, Robert

## Table of Contents
1. [Job Record (Main Table)](#job-record)
2. [Documents](#documents)
3. [Document Pages (OCR Text)](#document-pages)
4. [Mistral Extractions](#mistral-extractions)
5. [Sonnet Analyses (Business Rules)](#sonnet-analyses)
6. [Rule Analyses](#rule-analyses)
7. [Data Sources Summary](#data-sources)

## Job Record
**Source:** `jobs` table - Main job tracking record created during upload

| Field | Value | Description |
| --- | --- | --- |
| id | cmedgnfsi0000sa5fuzx81et1 | Primary key (CUID) |
| status | REVIEWING | Current processing status |
| fileName | Evans___Bob_NE_5916_estimate.pdf, Evans___Bob_NE_5916_roof-report.pdf | Original uploaded file name |
| fileSize | 699984 | File size in bytes |
| uploadedAt | 2025-08-15T23:29:50.514Z | When file was uploaded |
| processedAt | null | When processing started |
| completedAt | null | When processing completed |
| updatedAt | 2025-08-15T23:30:20.517Z | Last update timestamp |
| error | null | Any processing errors |
| filePath | /Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf | Server file storage path |
| fileHash | null | File content hash |
| customerName | Evans, Robert | Extracted customer name |
| customerAddress | 8002 KILPATRICK PKWY, BENNINGTON, NE 68007-3289 | Extracted customer address |
| customerPhone | null | Extracted customer phone |
| customerEmail | null | Extracted customer email |
| claimNumber | 1354565-242889-014101 | Extracted claim number |
| policyNumber | NEA47803 | Extracted policy number |
| dateOfLoss | 2024-05-21T07:00:00.000Z | Extracted date of loss |
| carrier | Progressive Insurance | Insurance carrier name |
| claimRep | Lawrence Brown | Claim representative |
| estimator | David Sanchez | Estimator name |
| originalEstimate | null | Total estimate value |
| roofSquares | 35 | Roof area in squares |
| roofStories | null | Number of stories |
| rakeLength | null | Rake length in LF |
| eaveLength | null | Eave length in LF |
| ridgeHipLength | null | Ridge/Hip length in LF |
| valleyLength | null | Valley length in LF |
| roofSlope | null | Roof slope/pitch |
| roofMaterial | null | Roof material type |
| userId | null | User who uploaded |
| extractionConfidence | high | Overall extraction confidence |
| extractionRate | 100 | Extraction success rate % |
| phase1ProcessingTime | 7359 | Processing time in ms |

## Documents
**Source:** `documents` table - Records for each uploaded document file

### Document 1
- **ID:** cmedgnfsz0002sa5f5bejlzq8
- **File Name:** Evans___Bob_NE_5916_estimate.pdf
- **Page Count:** null
- **Status:** UPLOADED
- **Processed At:** null
- **Error:** null
- **File Path:** /Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf
- **File Size:** 83098 bytes
- **MIME Type:** application/pdf

### Document 2
- **ID:** cmedgnft40004sa5fzc7c7gwe
- **File Name:** Evans___Bob_NE_5916_roof-report.pdf
- **Page Count:** null
- **Status:** UPLOADED
- **Processed At:** null
- **Error:** null
- **File Path:** /Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf
- **File Size:** 616886 bytes
- **MIME Type:** application/pdf

## Document Pages
**Source:** `document_pages` table - OCR extracted text from each page via Mistral OCR API

### Page 1
- **ID:** cmedgnoth0006sa5fecsqpvgo
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 1
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.213Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
1 ASI Way N, St. Petersburg, FL 33702

Insured: Evans, Robert
Home: 8002 KILPATRICK PKWY
BENNINGTON, NE 68007-3289
Property: 8002 KILPATRICK PKWY
BENNINGTON, NE 68007-3289

Claim Rep.: Lawrence Brown

Estimator: David Sanchez
Position: Property Adjuster
Company: Progressive Insurance

Claim Number: 1354565-242889- Policy Number: NEA47803 Type of Loss: Hail 014101

Date Contacted: 6/1/2024 2:17 PM
Date of Loss: 5/21/2024 9:00 AM
Date Inspected: 6/8/2024 8:30 AM
Date Est. Completed: 6/11/2024 2:43 PM
Price List: NEOM8X_JUN24
Restoration/Service/Remodel
Estimate: EVANS__ROBERT4

Date Received: 5/22/2024 12:00 AM
Date Entered: 5/22/2024 12:41 PM
```

### Page 1
- **ID:** cmedgnp7b0012sa5fy5w8m9x8
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 1
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 2
- **Extracted At:** 2025-08-15T23:30:02.710Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img2.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img2.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Precise Aerial Measurement Report 

AGR Roofing and Construction
![img-0.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img1.jpeg)

8002 Kilpatrick Parkway, Bennington, NE 68007
![img-1.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p1-img2.jpeg)

AGR Roofing and Construction
340 N 76th St
Omaha, NE 68114
tel. 402-639-1218
email: info@agr-mw.com
www.agrroofingandconstruction.com
```

### Page 2
- **ID:** cmedgnou20008sa5fidc72wy9
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 2
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.233Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
Dear Progressive Home Policyholder,
The estimate attached reflects the cost to repair the known damages to your property. Please review the estimate and note the Dwelling Summary page which shows the total damages including sales tax, applicable depreciation and your deductible.

If you hire a contractor to make the repairs, you may provide your contractor with a copy of the estimate.
This estimate may contain applicable depreciation determined upon your policy provisions, local case law, statute, and policy endorsements. Depreciation when applicable is a decrease in the value of the property including but not limited to age and or condition of the items being replaced.

Under replacement cost policies, the difference between recoverable depreciation is payable upon completion of repairs when costs have been necessarily incurred.

No supplement or other payments will be issued for any repairs not listed in the estimate without prior authorization. Approval must be given by Progressive 
... [TRUNCATED]
```

### Page 2
- **ID:** cmedgnp850014sa5f6zufbb9q
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 2
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.739Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# 8002 Kilpatrick Parkway, Bennington, NE 68007 

## TABLE OF CONTENTS

Images ..... 1
Length Diagram ..... 4
Pitch Diagram ..... 5
Area Diagram ..... 6
Notes Diagram ..... 7
Report Summary ..... 8
MEASUREMENTS
Total Roof Area $=3,467 \mathrm{sq} \mathrm{ft}$
Total Roof Facets $=11$
Predominant Pitch $=6 / 12$
Number of Stories $<=1$
Total Ridges/Hips $=107 \mathrm{ft}$
Total Valleys $=120 \mathrm{ft}$
Total Rakes $=223 \mathrm{ft}$
Total Eaves $=103 \mathrm{ft}$

In this 3D model, facets appear as semi-transparent to reveal overhangs.

## PREPARED FOR

Contact:
Company:
Address:
Phone:

Brandon Williams
AGR Roofing and
Construction
340 N 76th St
Omaha, NE 68114
402-639-1218

Measurements provided by www.eagleview.com
Certified Accurate
www.eagleview.com/Guarantee.aspx
```

### Page 3
- **ID:** cmedgnou5000asa5fp8ntlytu
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 3
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.237Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# EVANS__ROBERT4

## Source - HOVER Roof and Walls

## Exterior

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  1. Tear off, haul and dispose of comp. shingles Laminated | 34.26 SQ | 65.71 | 0.00 | 2,251.22 | $(0.00)$ | 2,251.22  |
|  2. Remove Additional charge for high roof (2 stories or greater) | 16.71 SQ | 6.45 | 0.00 | 107.78 | $(0.00)$ | 107.78  |
|  3. Remove Additional charge for steep roof - 7/12 to 9/12 slope | 1.11 SQ | 17.09 | 0.00 | 18.97 | $(0.00)$ | 18.97  |
|  4. Additional charge for high roof (2 stories or greater) | 18.38 SQ | 27.94 | 0.00 | 513.54 | $(0.00)$ | 513.54  |
|  10\% Waste Added |  |  |  |  |  |   |
|  5. Additional charge for steep roof - 7/12 to 9/12 slope | 1.22 SQ | 63.26 | 0.00 | 77.18 | $(0.00)$ | 77.18  |
|  10\% Waste Added |  |  |  |  |  |   |
|  6. Roofing felt - 15 lb . | 30.36 SQ | 43.16 | 12.09 | 1,322.43 | (327.59) | 994.84  |
|  7. Ice \& water barrier | 389.63 SF | 2.08
... [TRUNCATED]
```

### Page 3
- **ID:** cmedgnp8c0016sa5f897bbyw8
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 3
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.747Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p3-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p3-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# IMAGES 

The following aerial images show different angles of this structure for your reference.
Top View
![img-2.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p3-img1.jpeg)
```

### Page 4
- **ID:** cmedgnoub000csa5fzbidz695
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 4
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.242Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# PROGRESSIVE Progressive

1 ASI Way N, St. Petersburg, FL 33702

## CONTINUED - Gutters/Downspouts

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  This line item applies for the damaged downspout's on the following elevations: |  |  |  |  |  |   |
|  Right: 1 Downspout |  |  |  |  |  |   |
|  Back: 1 Downspout |  |  |  |  |  |   |
|  Left: 2 Downspout's |  |  |  |  |  |   |
|  Totals: Gutters/Downspouts |  |  | 68.97 | 2,265.87 | 417.67 | 1,848.20  |

|  Fascia | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  Right Elevation |  |  |  |  |  |   |
|  20. R\&R Fascia - metal - 8" | 58.92 LF | 8.25 | 11.41 | 497.50 | (46.19) | 451.31  |
|  Totals: Fascia |  |  | 11.41 | 497.50 | 46.19 | 451.31  |

Garage Door

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  21. R\&R Overhead door panel - up to 12' - 
... [TRUNCATED]
```

### Page 4
- **ID:** cmedgnp8g001asa5fds50mbhz
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 4
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 3
- **Extracted At:** 2025-08-15T23:30:02.751Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img2.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img3.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img2.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img3.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
![img-3.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img1.jpeg)

8002 Kilpatrick Parkway, Bennington, NE 68007

# IMAGES

## North Side

![img-4.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img2.jpeg)

## South Side

![img-5.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p4-img3.jpeg)

© 2008-2024 Eagle View Technologies, Inc. and Pictometry International Corp. – All Rights Reserved – Covered by one or more of U.S. Patent Nos. 8,078,436; 8,145,578; 8,170,840; 8,209,152; 8,515,125; 8,825,454; 9,135,737; 8,670,961; 9,514,568; 8,818,770; 8,542,880; 9,244,589; 9,329,749; 9,599,466. Other Patents Pending.
```

### Page 5
- **ID:** cmedgnouf000esa5fhxxcgho9
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 5
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.247Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
1 ASI Way N, St. Petersburg, FL 33702

Siding

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  Right Elevation |  |  |  |  |  |   |
|  24. R\&R Siding - vinyl | 60.00 SF | 5.88 | 8.09 | 360.89 | $(32.10)$ | 328.79  |
|  Totals: Siding |  |  | 8.09 | 360.89 | 32.10 | 328.79  |

Fencing

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  25. R\&R Vinyl (PVC) fence post cap only - 5" x 5" | 16.00 EA | 14.08 | 6.23 | 231.51 | $(0.00)$ | 231.51  |
|  Totals: Fencing |  |  | 6.23 | 231.51 | 0.00 | 231.51  |
|  Total: Exterior |  |  | 509.19 | 26,534.26 | 3,807.72 | 22,726.54  |
|  Total: Source - HOVER Roof and Walls |  |  | 509.19 | 26,534.26 | 3,807.72 | 22,726.54  |

# SKETCH1

Main Level

|  Deck |  |  |  |  |  | Height: 3'  |
| --- | --- | --- | --- | --- | --- | --- |
|  |   |   |   |   |   |   |

53.33 LF Floor Perimeter

Missing Wall 3' 4" X 3' Opens 
... [TRUNCATED]
```

### Page 5
- **ID:** cmedgnp8k001csa5fqaaivgb2
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 5
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 3
- **Extracted At:** 2025-08-15T23:30:02.756Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img2.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img3.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img2.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img3.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
![img-6.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img1.jpeg)

8002 Kilpatrick Parkway, Bennington, NE 68007

# IMAGES

## East Side

![img-7.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img2.jpeg)

## West Side

![img-8.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p5-img3.jpeg)

© 2008-2024 Eagle View Technologies, Inc. and Pictometry International Corp. – All Rights Reserved – Covered by one or more of U.S. Patent Nos. 8,078,436; 8,145,578; 8,170,840; 8,209,152; 8,515,125; 8,825,454; 9,135,737; 8,670,961; 9,514,568; 8,818,770; 8,542,880; 9,244,589; 9,329,749; 9,599,466. Other Patents Pending.
```

### Page 6
- **ID:** cmedgnouj000gsa5fu24mdt38
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 6
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.251Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# PROGRESSIVE Progressive

1 ASI Way N, St. Petersburg, FL 33702

|  Stairs | Height: 17'  |
| --- | --- |
|  4.14 SY Flooring | 37.22 SF Floor  |

|  Missing Wall | 3' 4" X 17' | Opens into DECK  |
| --- | --- | --- |
|  Missing Wall | 6' 5" X 17' | Opens into Exterior  |

|  Subroom: Stairs2 (1) | Height: 12' 6"  |
| --- | --- |
|  4.17 SY Flooring | 37.50 SF Floor  |

|  Missing Wall | 1" X 12' 6" | Opens into LANDING  |
| --- | --- | --- |
|  Missing Wall | 3' 4" X 12' 6" | Opens into LANDING  |
|  Missing Wall | 6' 6" X 12' 6" | Opens into Exterior  |
|  Missing Wall | 3' 4" X 12' 6" | Opens into Exterior  |
|  Missing Wall | 6' 5" X 12' 6" | Opens into STAIRS  |

EVANS_ROBERT4 6/11/2024 Page: 6
```

### Page 6
- **ID:** cmedgnp8w001esa5f7ku10xxh
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 6
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 2
- **Extracted At:** 2025-08-15T23:30:02.768Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img2.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img1.jpeg",
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img2.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# LENGTH DIAGRAM 

Total Line Lengths:
Ridges $=101 \mathrm{ft}$
Hips $=6 \mathrm{ft}$

Valleys $=120 \mathrm{ft}$
Rakes $=223 \mathrm{ft}$
Eaves $=103 \mathrm{ft}$

Flashing $=39 \mathrm{ft}$
Step flashing $=35 \mathrm{ft}$
Parapets $=0 \mathrm{ft}$
![img-9.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img1.jpeg)
![img-10.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p6-img2.jpeg)

Note: This diagram contains segment lengths (rounded to the nearest whole number) over 5.0 Feet. In some cases, segment labels have been removed for readability. Plus signs preface some numbers to avoid confusion when rotated (e.g. +6 and +9 ).
```

### Page 7
- **ID:** cmedgnoup000isa5fbf70jngl
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 7
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.257Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
1 ASI Way N, St. Petersburg, FL 33702

|  Subroom: Landing (2) |  |  |  |  |  | Height: 12' 6'  |
| --- | --- | --- | --- | --- | --- | --- |
|  2.44 | SY Flooring |  |  | 21.94 | SF Floor |   |
|  Missing Wall |  |  |  |  |  |   |
|  Missing Wall | 3' 4' X 12' 6' |  |  | Opens into STAIRS2 |  |   |
|  Missing Wall | 3' 3' X 12' 6' |  |  | Opens into Exterior |  |   |
|  Missing Wall | 6' 8' X 12' 6' |  |  | Opens into Exterior |  |   |
|  Missing Wall | 3' 4' X 12' 6' |  |  | Opens into Exterior |  |   |
|  Missing Wall | 3' 4' X 12' 6' |  |  | Opens into STAIRS |  |   |
|  Missing Wall | 1' X 12' 6' |  |  | Opens into STAIRS2 |  |   |
|  DESCRIPTION | QUANTITY | UNIT PRICE |  | TAX | RCV | DEPREC.  |
|  29. Clean with pressure/chemical spray | 96.67 SF | 0.43 |  | 2.34 | 43.91 | (0.00)  |
|  30. Paint deck - 2 coats paint | 96.67 SF | 1.30 |  | 1.33 | 127.00 | (41.89)  |
|  31. Paint deck handrail - 2 coats paint | 36.08 LF | 8.89 |  | 1.01 | 321.76 | (106.92)  |
|  Totals: Stairs | 
... [TRUNCATED]
```

### Page 7
- **ID:** cmedgnp94001gsa5f39z7ho6k
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 7
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.773Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p7-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p7-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# PITCH DIAGRAM 

Pitch values are shown in inches per foot, and arrows indicate slope direction. The predominant pitch on this roof is $6 / 12$
![img-11.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p7-img1.jpeg)

Note: This diagram contains labeled pitches for facet areas larger than 20.0 square feet. In some cases, pitch labels have been removed for readability. Blue shading indicates a pitch of $3 / 12$ and greater.
```

### Page 8
- **ID:** cmedgnout000ksa5fvlliaxfh
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 8
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.260Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# PROGRESSIVE Progressive

1 ASI Way N, St. Petersburg, FL 33702

## CONTINUED - Labor Minimums Applied

|  DESCRIPTION | QUANTITY | UNIT PRICE | TAX | RCV | DEPREC. | ACV  |
| --- | --- | --- | --- | --- | --- | --- |
|  Totals: Labor Minimums Applied |  |  | 0.00 | 237.24 | 0.00 | 237.24  |
|  Line Item Totals: EVANS__ROBERT4 |  |  | 521.23 | 28,048.50 | 4,137.42 | 23,911.08  |

## Grand Total Areas:

|  3,670.79 SF Walls | 0.00 | SF Ceiling | 3,670.79 | SF Walls and Ceiling  |
| --- | --- | --- | --- | --- |
|  96.67 SF Floor | 10.74 | SY Flooring | 625.60 | LF Floor Perimeter  |
|  0.00 SF Long Wall | 0.00 | SF Short Wall | 0.00 | LF Ceil. Perimeter  |
|  96.67 Floor Area | 65.00 | Total Area | 0.00 | Interior Wall Area  |
|  3,670.79 Exterior Wall Area | 572.27 | Exterior Perimeter of Walls |  |   |
|  3,426.11 Surface Area | 34.26 | Number of Squares | 324.99 | Total Perimeter Length  |
|  101.32 Total Ridge Length | 2.93 | Total Hip Length |  |   |
```

### Page 8
- **ID:** cmedgnp99001isa5fgf7wp2iu
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 8
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.780Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p8-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p8-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# AREA DIAGRAM 

Total Area $=3,467$ sq ft, with 11 facets.
![img-12.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p8-img1.jpeg)

Note: This diagram shows the square feet of each roof facet (rounded to the nearest Foot). The total area in square feet, at the top of this page, is based on the non-rounded values of each roof facet (rounded to the nearest square foot after being totaled).
```

### Page 9
- **ID:** cmedgnp3z000msa5fkhriqusq
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 9
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.590Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
|  Coverage | Item Total | $\%$ | ACV Total | $\%$  |
| --- | --- | --- | --- | --- |
|  Dwelling | 27,757.04 | 98.96\% | 23,619.62 | 98.78\%  |
|  Earthquake Dwelling | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Debris Removal | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  IRC - Dwelling | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Other Structures | 291.46 | 1.04\% | 291.46 | 1.22\%  |
|  Debris Removal | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Personal Property | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Debris Removal | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Loss of Use | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Liability | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Medical Payment | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Ordinance Or Law | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Buried Utility Coverage | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Equipment Breakdown Coverage | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Trees and Shrubs | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Debris Removal | 0.00 | 0.00\% | 0.00 | 0.00\%  |
|  Fire Department | 0.00 
... [TRUNCATED]
```

### Page 9
- **ID:** cmedgnp9e001ksa5frkcen0cu
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 9
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.785Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p9-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p9-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# NOTES DIAGRAM 

Roof facets are labeled from smallest to largest (A to Z) for easy reference.
![img-13.jpeg](/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p9-img1.jpeg)

Note: This diagram also appears in the Property Owner Report.
```

### Page 10
- **ID:** cmedgnp46000osa5fw6op81hf
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 10
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.597Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
|  PROGRESSIVE | Progressive  |
| --- | --- |
|  1 ASI Way N, St. Petersburg, FL 33702 |   |
|  Summary for Dwelling |   |
|  Line Item Total | 27,242.04  |
|  Material Sales Tax | 508.62  |
|  Cln Mat Sales Tax | 0.14  |
|  Subtotal | 27,750.80  |
|  Cleaning Total Tax | 6.24  |
|  Replacement Cost Value | $27,757.04  |
|  Less Depreciation | (4,137.42)  |
|  Actual Cash Value | $23,619.62  |
|  Less Deductible | (2,500.00)  |
|  Net Claim | $21,119.62  |
|  Total Recoverable Depreciation | 4,137.42  |
|  Net Claim if Depreciation is Recovered | $25,257.04  |
|  |   |
|  David Sanchez |   |
|  Property Adjuster |   |
```

### Page 10
- **ID:** cmedgnp9j001msa5f2i17crdu
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 10
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.790Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p10-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report-p10-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# 8002 Kilpatrick Parkway, Bennington, NE 68007

## REPORT SUMMARY

## All Structures

|  Areas per Pitch |  |  |  |  |  |  |  |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  Roof Pitches | $6 / 12$ | $7 / 12$ |  |  |  |  |  |   |
|  Area (sq ft) | 2856.0 | 610.6 |  |  |  |  |  |   |
|  \% of Roof | $82.4 \%$ | $17.6 \%$ |  |  |  |  |  |   |

The table above lists each pitch on this roof and the total area and percent (both rounded) of the roof with that pitch.

## Structure Complexity

|  Simple |  |  | Normal |  |  | Complex |  |   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  Waste Calculation |  |  |  |  |  |  |  |   |
|  NOTE: This waste calculation table is for asphalt shingle roofing applications. All values in table below only include roof areas of $3 / 12$ pitch or greater. |  |  |  |  |  |  |  |   |
|  For best measurements of all pitches, please refer to the Lengths, Areas, and Pitches section below. |  |  |  |  |  |  |  |   |
|  Waste \% | 0\
... [TRUNCATED]
```

### Page 11
- **ID:** cmedgnp9q001osa5fj81h1181
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 11
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.796Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Online Maps 

Online map of property
http://maps.google.com/maps?f=g\&source=s q\&hl=en\&geocode=\&q=8002+Kilpatrick+Parkway,Bennington,NE,68007
Directions from AGR Roofing and Construction to this property
http://maps.google.com/maps?f=d\&source=s d\&saddr=340+N+76th+St,Omaha,NE,68114\&daddr=8002+Kilpatrick+Parkway,Benning ton,NE,68007
```

### Page 11
- **ID:** cmedgnp4a000qsa5fssf56z1c
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 11
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.601Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Progressive

1 ASI Way N, St. Petersburg, FL 33702

## Summary for Other Structures

|  Line Item Total | 285.23  |
| --- | --- |
|  Material Sales Tax | 6.23  |
|  Replacement Cost Value | $291.46  |
|  Net Claim | $291.46  |

David Sanchez Property Adjuster

EVANS_ROBERT4 6/11/2024 Page: 11
```

### Page 12
- **ID:** cmedgnp4c000ssa5fuamdgj7s
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 12
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.603Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Recap of Taxes

|   | Material Sales Tax
$\mathbf{( 5 . 5 \% )}$ | Cln Mat Sales Tax
$\mathbf{( 5 . 5 \% )}$ | Cleaning Total Tax
$\mathbf{( 5 . 5 \% )}$ | Storage Rental Tax
$\mathbf{( 5 . 5 \% )}$ | Total Tax (5.5\%)  |
| --- | --- | --- | --- | --- | --- |
|  Line Items | 514.85 | 0.14 | 6.24 | 0.00 | 0.00  |
|  Total | $\mathbf{5 1 4 . 8 5}$ | $\mathbf{0 . 1 4}$ | $\mathbf{6 . 2 4}$ | $\mathbf{0 . 0 0}$ | $\mathbf{0 . 0 0}$  |
```

### Page 12
- **ID:** cmedgnphe001qsa5fle9c6npd
- **Document ID:** cmedgnft40004sa5fzc7c7gwe
- **Page Number:** 12
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:03.074Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
    "total_pages": 12,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# 8002 Kilpatrick Parkway, Bennington, NE 68007 

## IMPORTANT LEGAL NOTICE AND DISCLAIMER

## Notice and Disclaimer

No Warranty: The Copyrighted Materials are provided to you "as is," and you agree to use it at your own risk.
EagleView Technologies makes no guarantees, representations or warranties of any kind, express or implied, arising by law or otherwise, including but not limited to, content, quality, accuracy, completeness, effectiveness, reliability, fitness for a particular purpose, usefulness, use or results to be obtained from the Copyrighted Materials.

Contractors agree to always conduct a preliminary site survey to verify Roof Report ordered. In the event of an error in a Report, your sole remedy will be a refund of the fees paid by you to obtain this Report.
```

### Page 13
- **ID:** cmedgnp4e000usa5fah4fdnla
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 13
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.605Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Recap by Room 

## Estimate: EVANS__ROBERT4

## Area: Source - HOVER Roof and Walls

## Area: Exterior

Roof
Coverage: Dwelling
Gutters/Downspouts
Coverage: Dwelling
Fascia
Coverage: Dwelling
Garage Door
Coverage: Dwelling
Windows
Coverage: Dwelling
Siding
Coverage: Dwelling
Fencing
Coverage: Other Structures

## Area Subtotal: Exterior

Coverage: Dwelling
Coverage: Other Structures

## Area Subtotal: Source - HOVER Roof and Walls

Coverage: Dwelling
Coverage: Other Structures

## Area: SKETCH1

## Area: Main Level

Deck
Coverage: Dwelling
Stairs
Coverage: Dwelling
Debris Removal
Coverage: Dwelling

## Area Subtotal: Main Level

Coverage: Dwelling
Area Subtotal: SKETCH1
Coverage: Dwelling
EVANS__ROBERT4

21,471.74
$100.00 \%=$
$100.00 \%=$
$100.00 \%=$
$100.00 \%=$
$100.00 \%=$
$99.13 \%=$
$0.87 \%=$
21,471.74
2,196.90
2,196.90
486.09
486.09
989.46
989.46
302.80
302.80
352.80
352.80
225.28
225.28
225.28
26,025.07
25,799.79
225.28

26,025.07
25,799.79
225.28

614.34
614.34
487.99
487.
... [TRUNCATED]
```

### Page 14
- **ID:** cmedgnp4l000wsa5fexe2vmhy
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 14
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.613Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
1 ASI Way N, St. Petersburg, FL 33702

|  Labor Minimums Applied |  | 237.24 | 0.86\%  |
| --- | --- | --- | --- |
|  Coverage: Dwelling | $74.73 \%=$ | 177.29 |   |
|  Coverage: Other Structures | $25.27 \%=$ | 59.95 |   |
|  Subtotal of Areas |  | 27,527.27 | 100.00\%  |
|  Coverage: Dwelling | $98.96 \%=$ | 27,242.04 |   |
|  Coverage: Other Structures | $1.04 \%=$ | 285.23 |   |
|  Total |  | 27,527.27 | 100.00\%  |
```

### Page 15
- **ID:** cmedgnp4q000ysa5fcwkjx7fd
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 15
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 0
- **Extracted At:** 2025-08-15T23:30:02.616Z

#### Extracted Content Structure:
```json
{
  "assets": {},
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
# Recap by Category with Depreciation

|  Items |  |  | RCV | Deprec. | ACV  |
| --- | --- | --- | --- | --- | --- |
|  CLEANING |  |  | 113.24 |  | 113.24  |
|  Coverage: Dwelling | @ | $100.00 \%=$ | 113.24 |  |   |
|  GENERAL DEMOLITION |  |  | 2,921.26 |  | 2,921.26  |
|  Coverage: Dwelling | @ | $97.99 \%=$ | 2,862.54 |  |   |
|  Coverage: Other Structures | @ | $2.01 \%=$ | 58.72 |  |   |
|  DOORS |  |  | 468.56 | 56.79 | 411.77  |
|  Coverage: Dwelling | @ | $100.00 \%=$ | 468.56 |  |   |
|  FENCING |  |  | 226.51 |  | 226.51  |
|  Coverage: Other Structures | @ | $100.00 \%=$ | 226.51 |  |   |
|  PAINTING |  |  | 1,055.91 | 351.97 | 703.94  |
|  Coverage: Dwelling | @ | $100.00 \%=$ | 1,055.91 |  |   |
|  ROOFING |  |  | 18,994.20 | 3,101.87 | 15,892.33  |
|  Coverage: Dwelling | @ | $100.00 \%=$ | 18,994.20 |  |   |
|  SIDING |  |  | 788.20 | 78.82 | 709.38  |
|  Coverage: Dwelling | @ | $100.00 \%=$ | 788.20 |  |   |
|  SOFFIT, FASCIA, \& GUTTER |  |  | 2,550.30 | 463.86 | 2,
... [TRUNCATED]
```

### Page 16
- **ID:** cmedgnp6o0010sa5f9cl0h7u6
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 16
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.687Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p16-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p16-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
![img-0.jpeg](/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p16-img1.jpeg)

# SKETCH1 - Main Level



**Main Level**

*EVA NS*

*ROBERT 4*

*6/11/2024*

*Page: 16*
```

### Page 17
- **ID:** cmedgnp8c0018sa5fppw0u7qs
- **Document ID:** cmedgnfsz0002sa5f5bejlzq8
- **Page Number:** 17
- **Extraction Method:** mistral-ocr (Mistral OCR API)
- **Word Count:** 0
- **Confidence:** 0.95
- **Dimensions:** nullxnull pixels
- **Image Count:** 1
- **Extracted At:** 2025-08-15T23:30:02.696Z

#### Extracted Content Structure:
```json
{
  "assets": {
    "pageImages": [
      "/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p17-img1.jpeg"
    ]
  },
  "sections": {},
  "priority_fields": {},
  "processing_metadata": {
    "page_images": [
      "/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p17-img1.jpeg"
    ],
    "source_file": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
    "total_pages": 17,
    "document_type": "unknown",
    "model_version": "mistral-ocr-2505",
    "extraction_method": "smart-extraction-service",
    "processing_time_ms": 0
  },
  "business_rule_fields": {}
}
```

#### Raw Extracted Text:
```
Source - HOVER Roof and Walls - Exterior

![img-1.jpeg](/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate-p17-img1.jpeg)

Exterior

EVANS__ROBERT4

6/11/2024

Page: 17
```

## Mistral Extractions
**Source:** `mistral_extractions` table - Results from Mistral LLM analysis of document data

### Extraction 1
- **ID:** cmedgo0ku001ssa5f44takwfr
- **Model:** claude-3-5-haiku-hybrid
- **Document Type:** estimate
- **Processing Time:** nullms
- **Cost:** $0
- **Success:** true
- **Error:** null
- **Customer Name:** null
- **Claim Number:** 1354565-242889-014101*
- **Page Count:** 29
- **Confidence:** 0.9499999999999998
- **Extracted At:** 2025-08-15T23:30:17.451Z

#### Extracted Data:
```json
{
  "roofType": {
    "evidence": [
      "Tear off, haul and dispose of comp. shingles Laminated",
      "Laminated - comp. shingle rfg. - w/out felt",
      "Line item 11 specifically mentions 'Laminated - comp. shingle rfg.'"
    ],
    "roofType": "laminated",
    "reasoning": "Multiple explicit references to laminated/architectural composition shingles in roofing line items",
    "confidence": 0.95
  },
  "documents": [
    {
      "filePath": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590530_0_Evans___Bob_NE_5916_estimate.pdf",
      "pageCount": 17,
      "confidence": 0.8,
      "documentType": "estimate"
    },
    {
      "filePath": "/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads/1755300590535_1_Evans___Bob_NE_5916_roof-report.pdf",
      "pageCount": 12,
      "confidence": 0.8,
      "documentType": "roof_report"
    }
  ],
  "lineItems": [
    {
      "id": "line-12",
      "acv": 987.02,
      "rcv": 1147.66,
      "tax": 23.15,
      "code": "RFG RIDGC",
      "source": {
        "page": 1,
        "markdownSnippet": "12. Hip / Ridge cap ... | 93.32 LF | 12.05 | 23.15 | 1,147.66 | (160.64) | 987.02"
      },
      "section": "Exterior > Roofing",
      "quantity": {
        "unit": "LF",
        "value": 93.32,
        "unitNormalized": "linear_feet"
      },
      "pageIndex": 0,
      "unitPrice": 12.05,
      "confidence": 0.95,
      "lineNumber": 12,
      "description": "Hip / Ridge cap - Standard profile - composition shingles",
      "depreciation": 160.64,
      "isRidgeCapItem": true,
      "ridgeCapQuality": "purpose-built"
    }
  ],
  "ridgeCapItems": [
    {
      "id": "line-12",
      "acv": 987.02,
      "rcv": 1147.66,
      "tax": 23.15,
      "code": "RFG RIDGC",
      "source": {
        "page": 1,
        "markdownSnippet": "12. Hip / Ridge cap ... | 93.32 LF | 12.05 | 23.15 | 1,147.66 | (160.64) | 987.02"
      },
      "section": "Exterior > Roofing",
      "quantity": {
        "unit": "LF",
        "value": 93.32,
        "unitNormalized": "linear_feet"
      },
      "pageIndex": 0,
      "unitPrice": 12.05,
      "confidence": 0.95,
      "lineNumber": 12,
      "description": "Hip / Ridge cap - Standard profile - composition shingles",
      "depreciation": 160.64,
      "isRidgeCapItem": true,
      "ridgeCapQuality": "purpose-built"
    }
  ],
  "roofMeasurements": {
    "squares": 35,
    "hipLength": 6,
    "confidence": 0.95,
    "eaveLength": 103,
    "rakeLength": 223,
    "ridgeLength": 101,
    "sourcePages": [
      1,
      2,
      8
    ],
    "valleyLength": 120,
    "extractedFrom": "eagleview",
    "totalRidgeHip": 107,
    "totalRoofArea": 3467,
    "numberOfStories": 1,
    "predominantPitch": "6:12"
  },
  "extractionMetadata": {
    "costs": {
      "totalCost": 0,
      "lineItemExtractionCost": 0,
      "measurementExtractionCost": 0
    },
    "timestamp": "2025-08-15T23:30:17.451Z",
    "extractionMethod": "claude-hybrid",
    "documentsProcessed": 2
  }
}
```

## Sonnet Analyses
**Source:** `sonnet_analyses` table - Claude Sonnet 4 business rule analysis results

*No Sonnet analyses found*
## Rule Analyses
**Source:** `rule_analyses` table - Individual business rule analysis results

### Rule Analysis 1
- **ID:** cmedgo0mb001usa5fxm05cwot
- **Rule Type:** HIP_RIDGE_CAP
- **Status:** SUPPLEMENT_NEEDED
- **Passed:** null
- **Confidence:** 0.99
- **Recommendation:** null
- **Reasoning:** Ridge cap quantity analysis based on roof measurements: Ridges (101 LF) + Hips (6 LF) = 107 LF total required. Current estimate includes 93.32 LF. Shortage of 13.680000000000007 LF identified - supplement needed.
- **User Decision:** PENDING
- **User Notes:** null
- **Analyzed At:** 2025-08-15T23:30:17.506Z
- **Decided At:** null

#### Findings:
```json
{
  "status": "SUPPLEMENT_NEEDED",
  "variance": "-13.680000000000007 LF",
  "reasoning": "Ridge cap quantity analysis based on roof measurements: Ridges (101 LF) + Hips (6 LF) = 107 LF total required. Current estimate includes 93.32 LF. Shortage of 13.680000000000007 LF identified - supplement needed.",
  "unitPrice": 12.05,
  "confidence": 0.99,
  "costImpact": 164.8440000000001,
  "analysisPath": "laminated_purpose_built",
  "varianceType": "shortage",
  "materialStatus": "compliant",
  "varianceAmount": -13.68000000000001,
  "ridgeCapQuality": "purpose-built",
  "estimateQuantity": "93.32 LF",
  "requiredQuantity": "107 LF",
  "documentationNote": "Ridge cap shortage identified. EagleView report documents 107 LF total ridge/hip coverage required (Ridges: 101 LF + Hips: 6 LF). Current estimate includes only 93.32 LF, creating a shortage of 13.680000000000007 LF. Material type is correctly specified and should be increased to match documented roof geometry. Additional coverage required: 13.680000000000007 LF @ $12.05/LF = $164.84.",
  "evidenceReferences": [
    "Roof measurements from page(s): 1, 2, 8",
    "Ridge cap line item: Page 1 - \"Hip / Ridge cap - Standard profile - composition shingles\""
  ],
  "currentSpecification": {
    "code": "RFG RIDGC",
    "rate": "$12.05/LF",
    "total": "$1147.66",
    "quantity": "93.32 LF",
    "description": "Hip / Ridge cap - Standard profile - composition shingles"
  },
  "supplementRecommendation": "Add 13.680000000000007 LF ridge cap coverage"
}
```

## Data Sources Summary

### Data Flow & Origins:

1. **File Upload** → `jobs` table record created
2. **File Processing** → `documents` table record created
3. **OCR Processing** → Mistral OCR API extracts text → `document_pages` table
4. **Field Extraction** → Mistral LLM processes OCR text → `mistral_extractions` table
5. **Business Rule Analysis** → Claude Sonnet 4 analyzes extractions → `sonnet_analyses` table
6. **Rule Evaluation** → Individual rule assessments → `rule_analyses` table

### Record Counts:
- **Job Records:** 1
- **Documents:** 2
- **Document Pages:** 29
- **Mistral Extractions:** 1
- **Sonnet Analyses:** 0
- **Rule Analyses:** 1

### External API Usage:
- **Mistral OCR API** (`/v1/ocr`) - Page-by-page text extraction
- **Mistral LLM** (`mistral-large-latest`) - Field extraction from text
- **Claude Sonnet 4** (`claude-sonnet-4`) - Business rule analysis
