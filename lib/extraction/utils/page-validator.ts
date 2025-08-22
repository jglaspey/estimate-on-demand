/**
 * Page Validation Utilities
 *
 * Validates that extracted page numbers match actual content location
 * and fixes common page boundary detection issues
 */

interface PageContent {
  pageNumber: number;
  rawText: string;
}

interface LineItemWithPage {
  description: string;
  source?: {
    page?: number;
    markdownSnippet?: string;
  };
  pageIndex?: number;
  sourcePages?: number[];
  // Allow any additional properties to maintain compatibility
  [key: string]: any;
}

/**
 * Validates and corrects page numbers for line items
 * Generic function that preserves the input type
 */
export function validatePageNumbers<T extends LineItemWithPage>(
  lineItems: T[],
  pages: PageContent[]
): T[] {
  return lineItems.map(item => {
    // Get the claimed page number
    const claimedPage =
      item.source?.page || item.sourcePages?.[0] || (item.pageIndex ?? 0) + 1;

    // Try to find the actual page containing this content
    const actualPage = findActualPage(item, pages, claimedPage);

    // If we found a mismatch, fix it
    if (actualPage && actualPage !== claimedPage) {
      console.warn(
        `🔧 Page correction: "${item.description}" was on page ${claimedPage}, actually on page ${actualPage}`
      );

      // Update all page references
      if (item.source) {
        item.source.page = actualPage;
      }
      if (item.sourcePages) {
        item.sourcePages = [actualPage];
      }
      if (typeof item.pageIndex === 'number') {
        item.pageIndex = actualPage - 1;
      }
    }

    return item;
  });
}

/**
 * Find the actual page containing the line item
 */
function findActualPage<T extends LineItemWithPage>(
  item: T,
  pages: PageContent[],
  claimedPage: number
): number | null {
  // Get search text from the item
  const searchText = item.description || item.source?.markdownSnippet || '';
  if (!searchText) return null;

  // Create a search pattern (escape special regex chars)
  const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchPattern = new RegExp(escapedText.slice(0, 50), 'i');

  // First check the claimed page
  const claimedPageContent = pages.find(p => p.pageNumber === claimedPage);
  if (
    claimedPageContent?.rawText &&
    searchPattern.test(claimedPageContent.rawText)
  ) {
    return claimedPage; // It's actually correct
  }

  // Check adjacent pages (common off-by-one errors)
  for (const offset of [1, -1]) {
    const adjacentPage = claimedPage + offset;
    const adjacentContent = pages.find(p => p.pageNumber === adjacentPage);

    if (
      adjacentContent?.rawText &&
      searchPattern.test(adjacentContent.rawText)
    ) {
      // Extra validation for page boundaries
      if (isAtPageBoundary(searchText, adjacentContent.rawText)) {
        return adjacentPage;
      }
    }
  }

  // If not found in adjacent pages, search all pages
  for (const page of pages) {
    if (searchPattern.test(page.rawText)) {
      return page.pageNumber;
    }
  }

  return null; // Content not found
}

/**
 * Check if content appears at a page boundary (top of page)
 */
function isAtPageBoundary(searchText: string, pageText: string): boolean {
  const searchIndex = pageText.toLowerCase().indexOf(searchText.toLowerCase());
  if (searchIndex === -1) return false;

  // If the content appears in the first 200 characters, it's likely at the top
  // This catches items that appear right after page headers
  return searchIndex < 200;
}

/**
 * Detect page footer patterns to understand page boundaries
 */
export function detectPageFooter(text: string): number | null {
  // Common page footer patterns
  const patterns = [
    /Page:\s*(\d+)/i,
    /Page\s+(\d+)\s*$/im,
    /Date:.*Page:\s*(\d+)/i,
    /\bPage\s+(\d+)\s+of\s+\d+/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Fix common page boundary issues in extraction
 */
export function fixPageBoundaryIssues(
  pages: PageContent[]
): Map<number, { startsAt: number; endsAt: number }> {
  const pageBoundaries = new Map<
    number,
    { startsAt: number; endsAt: number }
  >();

  pages.forEach((page, index) => {
    const text = page.rawText;
    let startIndex = 0;
    let endIndex = text.length;

    // Find where this page's content actually ends (look for footer)
    const footerMatch = text.match(/Date:.*Page:\s*\d+[^\n]*$/);
    if (footerMatch && footerMatch.index) {
      endIndex = footerMatch.index;
    }

    // If this is not the first page, content might start after a header
    if (index > 0) {
      // Look for common header patterns
      const headerMatch = text.match(/^[\s\S]{0,100}(CONTINUED|Continued)/);
      if (headerMatch) {
        startIndex = headerMatch[0].length;
      }
    }

    pageBoundaries.set(page.pageNumber, {
      startsAt: startIndex,
      endsAt: endIndex,
    });
  });

  return pageBoundaries;
}
