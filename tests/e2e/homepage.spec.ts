import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Homepage', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('should load the homepage with all main sections', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/PhilGEPS Opportunity Search/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('PhilGEPS Opportunity Search');
    
    // Check all main sections are present
    await expect(page.locator('text=Crawler Control')).toBeVisible();
    await expect(page.locator('text=Statistics Overview')).toBeVisible();
    await expect(page.locator('text=Search Opportunities')).toBeVisible();
  });

  test('should display crawler control panel with all elements', async ({ page }) => {
    const crawlerSection = page.locator('[class*="crawler-control"]').first();
    
    // Check toggle switch
    const toggleSwitch = crawlerSection.locator('input[type="checkbox"]');
    await expect(toggleSwitch).toBeVisible();
    
    // Check Run Now button
    const runButton = crawlerSection.locator('button:has-text("Run Now")');
    await expect(runButton).toBeVisible();
    
    // Check status display
    await expect(crawlerSection.locator('text=/Status:/')).toBeVisible();
    await expect(crawlerSection.locator('text=/Last Crawl:/')).toBeVisible();
  });

  test('should load and display statistics', async ({ page }) => {
    // Wait for statistics API call
    await utils.waitForAPI('/api/statistics', { status: 200 });
    
    // Verify statistics are loaded
    await utils.verifyStatisticsLoaded();
    
    // Check specific stat cards
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);
    
    // Verify labels
    await expect(page.locator('text=Total Opportunities')).toBeVisible();
    await expect(page.locator('text=Active Opportunities')).toBeVisible();
    await expect(page.locator('text=Categories')).toBeVisible();
    await expect(page.locator('text=Procuring Entities')).toBeVisible();
  });

  test('should have functional search form with all fields', async ({ page }) => {
    const searchForm = page.locator('form').filter({ hasText: 'Search' });
    
    // Check all form fields
    await expect(searchForm.locator('input[placeholder="Enter keywords..."]')).toBeVisible();
    await expect(searchForm.locator('select#category')).toBeVisible();
    await expect(searchForm.locator('select#areaOfDelivery')).toBeVisible();
    await expect(searchForm.locator('input#minBudget')).toBeVisible();
    await expect(searchForm.locator('input#maxBudget')).toBeVisible();
    await expect(searchForm.locator('select#activeOnly')).toBeVisible();
    
    // Check buttons
    await expect(searchForm.locator('button:has-text("Search")')).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('should load categories and areas dropdowns', async ({ page }) => {
    // Wait for API calls
    await Promise.all([
      utils.waitForAPI('/api/categories', { status: 200 }),
      utils.waitForAPI('/api/areas', { status: 200 })
    ]);
    
    // Check categories loaded
    const categoryOptions = await page.locator('select#category option').count();
    expect(categoryOptions).toBeGreaterThan(1); // More than just "All Categories"
    
    // Check areas loaded
    const areaOptions = await page.locator('select#areaOfDelivery option').count();
    expect(areaOptions).toBeGreaterThan(1); // More than just "All Areas"
  });

  test('should show empty state before search', async ({ page }) => {
    // Should not show results table initially
    await expect(page.locator('table')).not.toBeVisible();
    
    // Should show initial message
    await expect(page.locator('text=Enter search criteria above')).toBeVisible();
  });

  test('should handle statistics refresh', async ({ page }) => {
    // Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();
    
    // Wait for new API call
    await utils.waitForAPI('/api/statistics', { status: 200 });
    
    // Verify stats are still displayed
    await utils.verifyStatisticsLoaded();
  });

  test('should display responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that sections stack vertically
    const sections = await page.locator('.bg-white').all();
    expect(sections.length).toBeGreaterThan(2);
    
    // Verify form fields adapt to mobile
    const formGroups = await page.locator('.form-group').all();
    for (const group of formGroups) {
      const box = await group.boundingBox();
      expect(box?.width).toBeLessThan(350);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock failed statistics call
    await utils.mockAPIResponse('/api/statistics', { success: false, error: 'Server error' }, 500);
    
    // Reload page
    await page.reload();
    
    // Statistics should show placeholder or error state
    const totalOpps = await page.textContent('#totalOpportunities');
    expect(totalOpps).toBe('-');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check form labels
    const labels = await page.locator('label').all();
    expect(labels.length).toBeGreaterThan(5);
    
    // Check button accessibility
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      expect(text).toBeTruthy();
    }
    
    // Check form inputs have proper associations
    const formInputs = await page.locator('input[id], select[id]').all();
    for (const input of formInputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label).toBeGreaterThan(0);
      }
    }
  });

  test('should persist search form values', async ({ page }) => {
    // Fill form
    await utils.fillSearchForm({
      query: 'construction',
      category: 'Construction',
      minBudget: '100000',
      maxBudget: '5000000',
      activeOnly: true
    });
    
    // Verify values are set
    await expect(page.locator('input[placeholder="Enter keywords..."]')).toHaveValue('construction');
    await expect(page.locator('input#minBudget')).toHaveValue('100000');
    await expect(page.locator('input#maxBudget')).toHaveValue('5000000');
    await expect(page.locator('select#activeOnly')).toHaveValue('true');
  });

  test('should have working navigation and links', async ({ page }) => {
    // Check if PhilGEPS links open in new tab
    const links = await page.locator('a[target="_blank"]').all();
    
    for (const link of links) {
      const target = await link.getAttribute('target');
      expect(target).toBe('_blank');
      
      const rel = await link.getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('should auto-refresh crawler status', async ({ page }) => {
    // Wait for initial status load
    await utils.waitForAPI('/api/crawler/status', { status: 200 });
    
    // Wait for auto-refresh (every 10 seconds)
    await page.waitForTimeout(11000);
    
    // Should make another status call
    const statusCalls = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/crawler/status')).length;
    });
    
    expect(statusCalls).toBeGreaterThan(1);
  });
});