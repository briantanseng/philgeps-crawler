import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('PhilGEPS Opportunity Search');
  });

  test('should show all main sections', async ({ page }) => {
    // Check for Crawler Control section
    await expect(page.locator('h2:has-text("Crawler Control")')).toBeVisible();
    
    // Check for Statistics section
    await expect(page.locator('h2:has-text("Statistics Overview")')).toBeVisible();
    
    // Check for Search form
    await expect(page.locator('h2:has-text("Search Opportunities")')).toBeVisible();
  });

  test('should display crawler status', async ({ page }) => {
    // Wait for crawler status to load
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
    
    // Check status indicator
    const statusIndicator = page.locator('div[class*="rounded-full"][class*="bg-"]').first();
    await expect(statusIndicator).toBeVisible();
    
    // Check status text (Active/Inactive/Running)
    const statusText = await page.locator('span:has-text("Active"), span:has-text("Inactive"), span:has-text("Running")').textContent();
    expect(['Active', 'Inactive', 'Running']).toContain(statusText);
  });

  test('should display statistics', async ({ page }) => {
    // Wait for statistics to load
    await page.waitForSelector('.animate-pulse', { state: 'detached' });
    
    // Check all statistics cards
    await expect(page.locator('text=Total Opportunities')).toBeVisible();
    await expect(page.locator('text=Active Opportunities')).toBeVisible();
    await expect(page.locator('div.text-gray-600:has-text("Categories")')).toBeVisible();
    await expect(page.locator('text=Procuring Entities')).toBeVisible();
    
    // Check that numbers are displayed
    const totalOpportunities = page.locator('div:has-text("Total Opportunities")').locator('div.text-4xl').first();
    await expect(totalOpportunities).not.toHaveText('-');
  });
});