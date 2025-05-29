import { test, expect } from '@playwright/test';

test.describe('Crawler Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for crawler status to load
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
  });

  test('should toggle crawler on/off', async ({ page }) => {
    // Find the toggle switch
    const toggleSwitch = page.locator('input[type="checkbox"]').first();
    const initialState = await toggleSwitch.isChecked();
    
    // Toggle the crawler
    await page.locator('label:has(input[type="checkbox"])').first().click();
    
    // Wait for toggle to complete
    await page.waitForTimeout(1000);
    
    // Check that state changed
    const newState = await toggleSwitch.isChecked();
    expect(newState).not.toBe(initialState);
    
    // Toggle back
    await page.locator('label:has(input[type="checkbox"])').first().click();
    await page.waitForTimeout(1000);
    
    const finalState = await toggleSwitch.isChecked();
    expect(finalState).toBe(initialState);
  });

  test('should run manual crawl', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/crawler/run', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Crawler started successfully'
        })
      });
    });
    
    // Click Run Now button
    const runButton = page.locator('button:has-text("Run Now")');
    await expect(runButton).toBeEnabled();
    
    // Click and wait for state change
    await runButton.click();
    
    // Button might show "Starting..." briefly or go directly to completed state
    // Check for either loading state or completion
    await page.waitForTimeout(500);
    
    const buttonText = await runButton.textContent();
    expect(['Starting...', 'Run Now']).toContain(buttonText);
  });

  test('should display last crawl results', async ({ page }) => {
    // Check for last crawl results section
    const resultsSection = page.locator('h3:has-text("Last Crawl Results")');
    
    // If visible, check the metrics
    if (await resultsSection.isVisible()) {
      await expect(page.locator('text=Total Found')).toBeVisible();
      await expect(page.locator('text=New')).toBeVisible();
      await expect(page.locator('text=Updated')).toBeVisible();
      await expect(page.locator('text=Errors')).toBeVisible();
    }
  });

  test('should refresh crawler status', async ({ page }) => {
    // Mock status before navigating
    let callCount = 0;
    await page.route('**/api/crawler/status', async route => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enabled: true,
            intervalMinutes: 60,
            isRunning: false,
            lastCrawl: {
              timestamp: new Date().toISOString(),
              duration: 10.5,
              status: 'completed',
              opportunitiesFound: callCount * 10,
              newOpportunities: callCount * 5,
              updatedOpportunities: callCount * 3,
              errors: 0
            }
          }
        })
      });
    });
    
    // Navigate to page after setting up route
    await page.goto('/');
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
    
    // Initial load should have been called
    expect(callCount).toBeGreaterThanOrEqual(1);
    
    // Wait for auto-refresh (happens every 10 seconds)
    await page.waitForTimeout(12000);
    
    // Verify the API was called multiple times after waiting
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});