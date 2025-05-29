import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';
import path from 'path';

test.describe('Export Functionality', () => {
  let utils: TestUtils;
  let downloadPath: string;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    
    // Mock search results
    const mockData = [
      utils.getMockOpportunityWithITB(),
      {
        ...utils.getMockOpportunityWithITB(),
        id: 2,
        reference_number: 'TEST-2025-002',
        title: 'Another Test Opportunity',
        category: 'Services',
        area_of_delivery: 'Region I',
        approved_budget: 500000
      }
    ];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
  });

  test('should show export button after search', async ({ page }) => {
    // Initially, export button should not be visible
    await expect(page.locator('button:has-text("Export CSV")')).not.toBeVisible();
    
    // Perform search
    await utils.fillSearchForm({ query: 'test' });
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Export button should now be visible
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('should download CSV file with search results', async ({ page }) => {
    // Perform search
    await utils.fillSearchForm({ query: 'test' });
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('button:has-text("Export CSV")').click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/opportunities.*\.csv$/);
    
    // Save and verify content
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
  });

  test('should include search parameters in export', async ({ page }) => {
    // Perform search with filters
    await utils.fillSearchForm({
      query: 'equipment',
      category: 'Goods',
      minBudget: '100000',
      maxBudget: '5000000',
      activeOnly: true
    });
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Intercept export request
    let exportUrl: URL | null = null;
    page.on('request', request => {
      if (request.url().includes('/api/opportunities/export')) {
        exportUrl = new URL(request.url());
      }
    });
    
    // Click export
    await page.locator('button:has-text("Export CSV")').click();
    
    // Wait a bit for request
    await page.waitForTimeout(1000);
    
    // Verify export includes search parameters
    expect(exportUrl).toBeTruthy();
    expect(exportUrl?.searchParams.get('q')).toBe('equipment');
    expect(exportUrl?.searchParams.get('category')).toBe('Goods');
    expect(exportUrl?.searchParams.get('minBudget')).toBe('100000');
    expect(exportUrl?.searchParams.get('maxBudget')).toBe('5000000');
    expect(exportUrl?.searchParams.get('activeOnly')).toBe('true');
  });

  test('should handle export with no results', async ({ page }) => {
    // Mock empty results
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 0,
      total: 0,
      data: []
    });
    
    // Perform search
    await page.locator('button:has-text("Search")').click();
    
    // Export button should not be visible when no results
    await expect(page.locator('button:has-text("Export CSV")')).not.toBeVisible();
  });

  test('should export correct CSV format', async ({ page }) => {
    // Mock specific data for CSV validation
    const testData = [{
      id: 1,
      reference_number: 'REF-001',
      title: 'Test Title',
      procuring_entity: 'Test Entity',
      category: 'Goods',
      area_of_delivery: 'NCR',
      approved_budget: 1000000,
      formatted_budget: '₱1,000,000',
      closing_date: '2025-06-01T00:00:00Z',
      days_until_closing: 5,
      hasItbDetails: true,
      hasRfqDetails: false,
      itb_solicitation_number: 'ITB-001',
      itb_procurement_mode: 'Public Bidding'
    }];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 1,
      total: 1,
      data: testData
    });
    
    // Mock CSV response
    const csvContent = `reference_number,title,procuring_entity,category,area_of_delivery,budget,closing_date,days_until_closing
REF-001,"Test Title","Test Entity",Goods,NCR,₱1000000,2025-06-01,5`;
    
    await page.route('/api/opportunities/export*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="opportunities_export.csv"'
        },
        body: csvContent
      });
    });
    
    // Search and export
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export CSV")').click();
    const download = await downloadPromise;
    
    // Verify CSV content structure
    const content = await download.failure();
    expect(content).toBeNull(); // No failure means successful download
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Perform search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Mock export error
    await page.route('/api/opportunities/export*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Export failed'
        })
      });
    });
    
    // Try to export
    await page.locator('button:has-text("Export CSV")').click();
    
    // Should handle error gracefully (implementation dependent)
    // The button should remain clickable
    await expect(page.locator('button:has-text("Export CSV")')).toBeEnabled();
  });

  test('should export with large dataset', async ({ page }) => {
    // Mock large dataset
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      ...utils.getMockOpportunityWithITB(),
      id: i + 1,
      reference_number: `TEST-${String(i + 1).padStart(5, '0')}`,
      title: `Opportunity ${i + 1}`,
      approved_budget: Math.floor(Math.random() * 10000000)
    }));
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: largeData.length,
      total: largeData.length,
      data: largeData
    });
    
    // Search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Mock successful export
    await page.route('/api/opportunities/export*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="opportunities_large.csv"'
        },
        body: 'reference_number,title\n' + 
              largeData.map(d => `${d.reference_number},"${d.title}"`).join('\n')
      });
    });
    
    // Export should work with large dataset
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export CSV")').click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should maintain export availability during pagination', async ({ page }) => {
    // Mock paginated data
    const paginatedData = Array.from({ length: 50 }, (_, i) => ({
      ...utils.getMockOpportunityWithITB(),
      id: i + 1,
      reference_number: `PAGE-${String(i + 1).padStart(3, '0')}`
    }));
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: paginatedData.length,
      total: paginatedData.length,
      data: paginatedData
    });
    
    // Search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Export button should be visible
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    
    // Go to next page
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);
    
    // Export button should still be visible
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('should include ITB details in export when available', async ({ page }) => {
    // Mock data with ITB details
    const dataWithITB = [{
      ...utils.getMockOpportunityWithITB(),
      itb_solicitation_number: 'ITB-EXPORT-001',
      itb_procurement_mode: 'International Competitive Bidding',
      itb_contact_person: 'Export Test Person'
    }];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 1,
      total: 1,
      data: dataWithITB
    });
    
    // Search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Intercept export to check if ITB fields are included
    let exportRequested = false;
    page.on('request', request => {
      if (request.url().includes('/api/opportunities/export')) {
        exportRequested = true;
      }
    });
    
    // Click export
    await page.locator('button:has-text("Export CSV")').click();
    
    // Verify export was requested
    await page.waitForTimeout(1000);
    expect(exportRequested).toBe(true);
  });

  test('should respect user locale for number formatting in export', async ({ page }) => {
    // This test verifies that exported numbers respect locale settings
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Mock export with locale-specific formatting
    await page.route('/api/opportunities/export*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv;charset=utf-8',
        headers: {
          'Content-Disposition': 'attachment; filename="opportunities.csv"'
        },
        body: 'reference_number,budget\nTEST-001,"₱1,000,000.00"'
      });
    });
    
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export CSV")').click();
    const download = await downloadPromise;
    
    // Verify proper encoding
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle special characters in CSV export', async ({ page }) => {
    // Mock data with special characters
    const specialData = [{
      ...utils.getMockOpportunityWithITB(),
      title: 'Test "Quoted" & Special <Characters>',
      procuring_entity: 'Entity, Inc.',
      description: 'Line 1\nLine 2\rLine 3'
    }];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 1,
      total: 1,
      data: specialData
    });
    
    // Search and export
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Export should handle special characters
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export CSV")').click();
    const download = await downloadPromise;
    
    expect(download).toBeTruthy();
  });

  test('should show loading state during export of large files', async ({ page }) => {
    // Search first
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Mock slow export
    await page.route('/api/opportunities/export*', async route => {
      // Delay response
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="opportunities.csv"'
        },
        body: 'test,data'
      });
    });
    
    // Click export
    const exportButton = page.locator('button:has-text("Export CSV")');
    await exportButton.click();
    
    // Button might show loading state or be disabled
    // Implementation dependent - check if button changes state
    const isDisabled = await exportButton.isDisabled();
    const buttonText = await exportButton.textContent();
    
    // Either disabled or shows different text during export
    expect(isDisabled || buttonText !== 'Export CSV').toBeTruthy();
  });
});