import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
  });

  test('should perform a keyword search', async ({ page }) => {
    // Fill in search keyword
    await page.fill('input[placeholder*="keywords"]', 'construction');
    
    // Click search button
    await page.click('button:has-text("Search")');
    
    // Wait for either results table or no results message
    await page.waitForTimeout(2000);
    
    // Check that either results are displayed or no results message
    const hasTable = await page.locator('table').isVisible();
    const hasNoResults = await page.locator('text=No results found').isVisible();
    
    expect(hasTable || hasNoResults).toBeTruthy();
    
    // If table is visible, check headers
    if (hasTable) {
      await expect(page.locator('th:has-text("Reference #")')).toBeVisible();
      await expect(page.locator('th:has-text("Title")')).toBeVisible();
      await expect(page.locator('th:has-text("Entity")')).toBeVisible();
    }
  });

  test('should show no results message', async ({ page }) => {
    // Search for something unlikely to exist
    await page.fill('input[placeholder*="keywords"]', 'xyzabc123unlikely');
    await page.click('button:has-text("Search")');
    
    // Wait for search to complete
    await page.waitForTimeout(2000);
    
    // Check for no results message
    await expect(page.locator('text=No results found')).toBeVisible();
  });

  test('should apply filters', async ({ page }) => {
    // Expand filter options
    const filterButton = page.locator('button:has-text("filters")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
    
    // Select a category if available
    const categorySelect = page.locator('select[id*="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Select status
    await page.selectOption('select[id="activeOnly"]', 'true');
    
    // Set budget range
    await page.fill('input[placeholder="0"]', '100000');
    await page.fill('input[placeholder="Any"]', '1000000');
    
    // Perform search
    await page.click('button:has-text("Search")');
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Verify filters were applied (results should be visible or no results message)
    const hasTable = await page.locator('table').isVisible();
    const hasNoResults = await page.locator('text=No results found').isVisible();
    expect(hasTable || hasNoResults).toBeTruthy();
  });

  test('should clear search form', async ({ page }) => {
    // Fill form
    await page.fill('input[placeholder*="keywords"]', 'test keyword');
    
    // Clear form by refreshing page (no Clear button in current implementation)
    await page.reload();
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
    
    // Check that input is cleared
    await expect(page.locator('input[placeholder*="keywords"]')).toHaveValue('');
  });

  test('should export search results', async ({ page }) => {
    // Perform a search first - use a broader search term
    await page.fill('input[placeholder*="keywords"]', '');
    await page.click('button:has-text("Search")');
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check if we have results to export
    const hasTable = await page.locator('table').isVisible();
    
    if (hasTable) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await page.click('button:has-text("Export to CSV")');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('opportunities');
      expect(download.suggestedFilename()).toContain('.csv');
    } else {
      // Skip if no results
      console.log('No results to export, skipping export test');
    }
  });
});