import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Search Functionality', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    
    // Wait for page to be ready
    await utils.waitForAPI('/api/statistics');
  });

  test('should perform basic keyword search', async ({ page }) => {
    // Fill search form
    await utils.fillSearchForm({ query: 'construction' });
    
    // Submit search
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for search results
    const response = await utils.waitForAPI('/api/opportunities/search', { 
      method: 'GET',
      status: 200 
    });
    
    // Verify response
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    
    // Wait for table to render
    await utils.waitForTableResults();
    
    // Verify results contain search term
    const tableData = await utils.getTableData();
    const hasConstructionInResults = tableData.some(row => 
      row['Title']?.toLowerCase().includes('construction') ||
      row['Category']?.toLowerCase().includes('construction')
    );
    expect(hasConstructionInResults).toBe(true);
  });

  test('should search with all filters', async ({ page }) => {
    // Fill all search fields
    await utils.fillSearchForm({
      query: 'supplies',
      category: 'Goods',
      area: 'NCR',
      minBudget: '100000',
      maxBudget: '5000000',
      activeOnly: true
    });
    
    // Submit search
    await page.locator('button:has-text("Search")').click();
    
    // Verify API call includes all parameters
    const response = await utils.waitForAPI('/api/opportunities/search');
    const url = new URL(response.url());
    
    expect(url.searchParams.get('q')).toBe('supplies');
    expect(url.searchParams.get('category')).toBe('Goods');
    expect(url.searchParams.get('areaOfDelivery')).toBe('NCR');
    expect(url.searchParams.get('minBudget')).toBe('100000');
    expect(url.searchParams.get('maxBudget')).toBe('5000000');
    expect(url.searchParams.get('activeOnly')).toBe('true');
    
    // Verify results displayed
    await utils.waitForTableResults();
  });

  test('should show empty results message when no matches', async ({ page }) => {
    // Mock empty results
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 0,
      total: 0,
      data: []
    });
    
    // Search for non-existent term
    await utils.fillSearchForm({ query: 'xyznonexistent123' });
    await page.locator('button:has-text("Search")').click();
    
    // Should show no results message
    await expect(page.locator('text=No results found')).toBeVisible();
    await expect(page.locator('text=Try adjusting your search criteria')).toBeVisible();
  });

  test('should display search results with all columns', async ({ page }) => {
    // Mock search response with ITB data
    const mockData = [utils.getMockOpportunityWithITB()];
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
    
    // Perform search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Check all expected columns are present
    const headers = await page.$$eval('table thead th', 
      cells => cells.map(cell => cell.textContent?.trim() || '')
    );
    
    expect(headers).toContain('Reference #');
    expect(headers).toContain('Title');
    expect(headers).toContain('Procuring Entity');
    expect(headers).toContain('Category');
    expect(headers).toContain('Area');
    expect(headers).toContain('Budget');
    expect(headers).toContain('Closing Date');
    expect(headers).toContain('Days Left');
  });

  test('should display ITB indicator for opportunities with details', async ({ page }) => {
    // Mock data with and without ITB details
    const mockData = [
      utils.getMockOpportunityWithITB(),
      {
        ...utils.getMockOpportunityWithITB(),
        id: 2,
        reference_number: 'TEST-2025-002',
        hasItbDetails: false,
        itb_solicitation_number: null
      }
    ];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
    
    // Perform search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // First row should have ITB indicator
    const hasITB1 = await utils.rowHasITBIndicator(0);
    expect(hasITB1).toBe(true);
    
    // Second row should not have ITB indicator
    const hasITB2 = await utils.rowHasITBIndicator(1);
    expect(hasITB2).toBe(false);
  });

  test('should handle budget range filtering', async ({ page }) => {
    // Test min budget only
    await utils.fillSearchForm({ minBudget: '1000000' });
    await page.locator('button:has-text("Search")').click();
    
    const response1 = await utils.waitForAPI('/api/opportunities/search');
    const url1 = new URL(response1.url());
    expect(url1.searchParams.get('minBudget')).toBe('1000000');
    expect(url1.searchParams.get('maxBudget')).toBe('');
    
    // Clear and test max budget only
    await page.reload();
    await utils.fillSearchForm({ maxBudget: '5000000' });
    await page.locator('button:has-text("Search")').click();
    
    const response2 = await utils.waitForAPI('/api/opportunities/search');
    const url2 = new URL(response2.url());
    expect(url2.searchParams.get('minBudget')).toBe('');
    expect(url2.searchParams.get('maxBudget')).toBe('5000000');
  });

  test('should display status badges correctly', async ({ page }) => {
    // Mock data with different statuses
    const now = new Date();
    const mockData = [
      {
        ...utils.getMockOpportunityWithITB(),
        id: 1,
        closing_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Expired
        days_until_closing: -1,
        is_expired: true
      },
      {
        ...utils.getMockOpportunityWithITB(),
        id: 2,
        closing_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Closing soon
        days_until_closing: 2,
        is_closing_soon: true
      },
      {
        ...utils.getMockOpportunityWithITB(),
        id: 3,
        closing_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Active
        days_until_closing: 30,
        is_closing_soon: false
      }
    ];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
    
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Check status badges
    await expect(page.locator('.bg-red-100:has-text("Expired")')).toBeVisible();
    await expect(page.locator('.bg-yellow-100:has-text("Closing Soon")')).toBeVisible();
    await expect(page.locator('.bg-green-100:has-text("Active")')).toBeVisible();
  });

  test('should clear search form', async ({ page }) => {
    // Fill form with data
    await utils.fillSearchForm({
      query: 'test',
      category: 'Goods',
      minBudget: '100000',
      maxBudget: '500000'
    });
    
    // Clear form by reloading
    await page.reload();
    
    // Verify form is cleared
    await expect(page.locator('input[placeholder="Enter keywords..."]')).toHaveValue('');
    await expect(page.locator('input#minBudget')).toHaveValue('');
    await expect(page.locator('input#maxBudget')).toHaveValue('');
    await expect(page.locator('select#category')).toHaveValue('');
  });

  test('should maintain search results during pagination', async ({ page }) => {
    // Mock large dataset
    const mockData = Array.from({ length: 25 }, (_, i) => ({
      ...utils.getMockOpportunityWithITB(),
      id: i + 1,
      reference_number: `TEST-2025-${String(i + 1).padStart(3, '0')}`,
      title: `Test Opportunity ${i + 1}`
    }));
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
    
    // Perform search
    await utils.fillSearchForm({ query: 'test' });
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Check pagination controls
    await expect(page.locator('text=/Page 1 of/')).toBeVisible();
    
    // Go to next page
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    
    // Verify page changed
    await expect(page.locator('text=/Page 2 of/')).toBeVisible();
    
    // Search query should still be in the form
    await expect(page.locator('input[placeholder="Enter keywords..."]')).toHaveValue('test');
  });

  test('should handle special characters in search', async ({ page }) => {
    // Test with special characters
    const specialQueries = [
      'test & development',
      'goods/services',
      'procurement (2025)',
      '"exact phrase"',
      'test@email.com'
    ];
    
    for (const query of specialQueries) {
      await utils.fillSearchForm({ query });
      await page.locator('button:has-text("Search")').click();
      
      const response = await utils.waitForAPI('/api/opportunities/search');
      const url = new URL(response.url());
      
      // Verify query is properly encoded
      expect(decodeURIComponent(url.searchParams.get('q') || '')).toBe(query);
      
      // Clear for next iteration
      await page.locator('input[placeholder="Enter keywords..."]').clear();
    }
  });

  test('should show loading state during search', async ({ page }) => {
    // Intercept and delay the response
    await page.route('/api/opportunities/search*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          total: 1,
          data: [utils.getMockOpportunityWithITB()]
        })
      });
    });
    
    // Start search
    await page.locator('button:has-text("Search")').click();
    
    // Should show loading indicator
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(page.locator('text=Loading opportunities...')).toBeVisible();
    
    // Wait for results
    await utils.waitForTableResults();
    
    // Loading should be gone
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });

  test('should validate budget inputs', async ({ page }) => {
    // Test negative numbers
    await page.fill('input#minBudget', '-1000');
    await page.fill('input#maxBudget', '-5000');
    
    // Browser should prevent negative values
    const minValue = await page.locator('input#minBudget').inputValue();
    const maxValue = await page.locator('input#maxBudget').inputValue();
    
    // HTML5 number input should handle this
    expect(Number(minValue)).toBeGreaterThanOrEqual(0);
    expect(Number(maxValue)).toBeGreaterThanOrEqual(0);
  });

  test('should perform search on pressing Enter', async ({ page }) => {
    // Fill search field
    await utils.fillSearchForm({ query: 'equipment' });
    
    // Press Enter in search field
    await page.locator('input[placeholder="Enter keywords..."]').press('Enter');
    
    // Should trigger search
    await utils.waitForAPI('/api/opportunities/search');
    await utils.waitForTableResults();
  });
});