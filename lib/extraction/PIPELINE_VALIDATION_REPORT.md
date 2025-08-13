# Extraction Pipeline Validation Report

**Generated**: 2025-08-13T01:25:07.121Z
**Pipeline**: Multi-stage Claude Haiku 3.5 with business rule assessment
**Documents Tested**: 3

## 📊 Overall Performance

- **Success Rate**: 3/3 (100.0%)
- **Total Cost**: $0.0181
- **Average Processing Time**: 5914ms

## 🔍 Business Rules Compliance

- **Overall Compliance**: 5/7 (71.4%)

## 📄 Document Analysis

### Evans___Bob_NE_5916_estimate.pdf

✅ **Success** - 23 fields extracted
- **Processing Time**: 7413ms
- **Cost**: $0.0068
- **Business Rules**: 3/4 passed

**Business Rule Details**:
- Hip/Ridge Cap: ✅ Uses proper purpose-built ridge caps
- Starter Strip: ✅ Uses universal starter course with proper adhesive
- Drip Edge: ❌ Insufficient drip edge: 324.99 LF provided, 649.98 LF required
- Ice & Water Barrier: ✅ Adequate ice & water barrier coverage: 389.63 SF

**Extracted Data Summary**:
- Roof Measurements: 8/8 fields
- Materials: 5/5 types

### Evans___Bob_NE_5916_roof-report.pdf

✅ **Success** - 11 fields extracted
- **Processing Time**: 3331ms
- **Cost**: $0.0054
- **Business Rules**: 1/1 passed

**Business Rule Details**:
- Drip Edge: ✅ Drip edge quantity (326 LF) matches eave + rake requirements (326 LF)

**Extracted Data Summary**:
- Roof Measurements: 8/8 fields
- Materials: 1/5 types

### Fritch__Jeanne_NE_5919_estimate.pdf

✅ **Success** - 19 fields extracted
- **Processing Time**: 6997ms
- **Cost**: $0.0059
- **Business Rules**: 1/2 passed

**Business Rule Details**:
- Starter Strip: ✅ Uses universal starter course with proper adhesive
- Ice & Water Barrier: ❌ Insufficient ice & water barrier: 89.87 SF provided, minimum 259 SF recommended

**Extracted Data Summary**:
- Roof Measurements: 7/8 fields
- Materials: 4/5 types

## 💡 Recommendations

✅ Pipeline is working correctly across all test documents.

📋 Business rule assessment is working but some documents have compliance issues. This is expected and demonstrates the system is correctly identifying problems.

🚀 **Next Steps**:
1. Integrate pipeline into API routes
2. Design database schema based on extraction patterns
3. Implement real-time WebSocket updates
4. Create user interface for reviewing extracted data
