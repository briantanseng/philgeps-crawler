import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Crawler Control', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    
    // Mock crawler status
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: false,
        running: false,
        lastCrawl: {
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          duration: 120,
          opportunitiesFound: 50,
          newOpportunities: 10,
          updatedOpportunities: 40,
          itbDetailsFetched: 25,
          errors: 2
        }
      },
      config: {
        intervalMinutes: 60,
        maxPages: 10
      }
    });
  });

  test('should display crawler control panel', async ({ page }) => {
    // Check main elements
    await expect(page.locator('h2:has-text("Crawler Control")')).toBeVisible();
    
    // Toggle switch
    const toggleSwitch = page.locator('input[type="checkbox"][role="switch"]');
    await expect(toggleSwitch).toBeVisible();
    
    // Run now button
    const runButton = page.locator('button:has-text("Run Now")');
    await expect(runButton).toBeVisible();
    
    // Status display
    await expect(page.locator('text=Status:')).toBeVisible();
    await expect(page.locator('text=Last Crawl:')).toBeVisible();
  });

  test('should display crawler status correctly', async ({ page }) => {
    // Wait for status to load
    await utils.waitForAPI('/api/crawler/status');
    
    // Check status displays
    await expect(page.locator('text=Inactive').first()).toBeVisible();
    
    // Check last crawl info
    await expect(page.locator('text=/ago/')).toBeVisible();
    await expect(page.locator('text=Found: 50')).toBeVisible();
    await expect(page.locator('text=New: 10')).toBeVisible();
    await expect(page.locator('text=Updated: 40')).toBeVisible();
  });

  test('should enable crawler', async ({ page }) => {
    // Mock toggle response
    await utils.mockAPIResponse('/api/crawler/toggle', {
      success: true,
      enabled: true
    });
    
    // Mock updated status
    await page.route('/api/crawler/status', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: {
              enabled: true,
              running: false,
              lastCrawl: null
            }
          })
        });
      }
    });
    
    // Click toggle
    const toggleSwitch = page.locator('input[type="checkbox"][role="switch"]');
    await toggleSwitch.click();
    
    // Wait for API call
    await utils.waitForAPI('/api/crawler/toggle', { method: 'POST' });
    
    // Status should update
    await expect(page.locator('text=Active').first()).toBeVisible();
  });

  test('should disable crawler', async ({ page }) => {
    // Set initial state as enabled
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: true,
        running: false
      }
    });
    
    // Reload to get enabled state
    await page.reload();
    await utils.waitForAPI('/api/crawler/status');
    
    // Mock toggle response
    await utils.mockAPIResponse('/api/crawler/toggle', {
      success: true,
      enabled: false
    });
    
    // Click toggle to disable
    const toggleSwitch = page.locator('input[type="checkbox"][role="switch"]');
    await toggleSwitch.click();
    
    // Wait for API call
    await utils.waitForAPI('/api/crawler/toggle', { method: 'POST' });
  });

  test('should run manual crawl', async ({ page }) => {
    // Mock run response
    await utils.mockAPIResponse('/api/crawler/run', {
      success: true,
      message: 'Crawler started successfully',
      crawlId: 'crawl_20250529_120000'
    });
    
    // Mock status showing running
    let callCount = 0;
    await page.route('/api/crawler/status', async route => {
      callCount++;
      const isRunning = callCount === 2; // Second call shows running
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            enabled: false,
            running: isRunning,
            lastCrawl: null
          }
        })
      });
    });
    
    // Click Run Now
    const runButton = page.locator('button:has-text("Run Now")');
    await runButton.click();
    
    // Wait for API call
    await utils.waitForAPI('/api/crawler/run', { method: 'POST' });
    
    // Status should show running
    await expect(page.locator('text=Running').first()).toBeVisible();
    
    // Button should be disabled while running
    await expect(runButton).toBeDisabled();
  });

  test('should handle crawler errors', async ({ page }) => {
    // Mock error response
    await utils.mockAPIResponse('/api/crawler/toggle', {
      success: false,
      error: 'Failed to toggle crawler'
    }, 500);
    
    // Try to toggle
    const toggleSwitch = page.locator('input[type="checkbox"][role="switch"]');
    await toggleSwitch.click();
    
    // Should show error (implementation dependent)
    // Status should remain unchanged
    await expect(page.locator('text=Inactive').first()).toBeVisible();
  });

  test('should auto-refresh crawler status', async ({ page }) => {
    let statusCalls = 0;
    
    // Track status calls
    await page.route('/api/crawler/status', async route => {
      statusCalls++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            enabled: false,
            running: false,
            lastCrawl: {
              timestamp: new Date().toISOString(),
              opportunitiesFound: statusCalls * 10 // Different each time
            }
          }
        })
      });
    });
    
    // Wait for initial load
    await utils.waitForAPI('/api/crawler/status');
    const initialCalls = statusCalls;
    
    // Wait for auto-refresh (10 seconds)
    await page.waitForTimeout(11000);
    
    // Should have made more calls
    expect(statusCalls).toBeGreaterThan(initialCalls);
  });

  test('should display crawler configuration', async ({ page }) => {
    // Configuration should be visible
    await expect(page.locator('text=Interval: 60 minutes')).toBeVisible();
    await expect(page.locator('text=Max Pages: 10')).toBeVisible();
  });

  test('should disable controls when crawler is running', async ({ page }) => {
    // Mock running state
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: true,
        running: true,
        currentPage: 5,
        totalPages: 10
      }
    });
    
    // Reload to get running state
    await page.reload();
    await utils.waitForAPI('/api/crawler/status');
    
    // Toggle should be disabled
    const toggleSwitch = page.locator('input[type="checkbox"][role="switch"]');
    await expect(toggleSwitch).toBeDisabled();
    
    // Run button should be disabled
    const runButton = page.locator('button:has-text("Run Now")');
    await expect(runButton).toBeDisabled();
    
    // Should show running status
    await expect(page.locator('text=Running').first()).toBeVisible();
  });

  test('should show progress when crawler is running', async ({ page }) => {
    // Mock running state with progress
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: true,
        running: true,
        currentPage: 3,
        totalPages: 10,
        currentOperation: 'Fetching ITB details'
      }
    });
    
    // Reload to get running state
    await page.reload();
    await utils.waitForAPI('/api/crawler/status');
    
    // Should show progress
    await expect(page.locator('text=Page 3/10')).toBeVisible();
    await expect(page.locator('text=Fetching ITB details')).toBeVisible();
  });

  test('should format last crawl time correctly', async ({ page }) => {
    const testCases = [
      { 
        timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
        expected: /seconds? ago/
      },
      { 
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        expected: /5 minutes ago/
      },
      { 
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        expected: /2 hours ago/
      },
      { 
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        expected: /1 day ago/
      }
    ];
    
    for (const testCase of testCases) {
      await utils.mockAPIResponse('/api/crawler/status', {
        success: true,
        status: {
          enabled: false,
          running: false,
          lastCrawl: {
            timestamp: testCase.timestamp,
            opportunitiesFound: 10
          }
        }
      });
      
      await page.reload();
      await utils.waitForAPI('/api/crawler/status');
      
      await expect(page.locator('text=' + testCase.expected)).toBeVisible();
    }
  });

  test('should show ITB details in crawler stats', async ({ page }) => {
    // Mock status with ITB details
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: false,
        running: false,
        lastCrawl: {
          timestamp: new Date().toISOString(),
          opportunitiesFound: 100,
          newOpportunities: 20,
          updatedOpportunities: 80,
          itbDetailsFetched: 75,
          errors: 5,
          duration: 300
        }
      }
    });
    
    await page.reload();
    await utils.waitForAPI('/api/crawler/status');
    
    // Should display ITB stats
    await expect(page.locator('text=ITB Details: 75')).toBeVisible();
    await expect(page.locator('text=Errors: 5')).toBeVisible();
    await expect(page.locator('text=Duration: 5m 0s')).toBeVisible();
  });

  test('should handle never-run crawler state', async ({ page }) => {
    // Mock status with no last crawl
    await utils.mockAPIResponse('/api/crawler/status', {
      success: true,
      status: {
        enabled: false,
        running: false,
        lastCrawl: null
      },
      config: {
        intervalMinutes: 60,
        maxPages: 10
      }
    });
    
    await page.reload();
    await utils.waitForAPI('/api/crawler/status');
    
    // Should show appropriate message
    await expect(page.locator('text=Never run')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Crawler control should still be functional
    await expect(page.locator('h2:has-text("Crawler Control")')).toBeVisible();
    
    // Elements should stack vertically
    const toggle = page.locator('input[type="checkbox"][role="switch"]');
    const runButton = page.locator('button:has-text("Run Now")');
    
    const toggleBox = await toggle.boundingBox();
    const buttonBox = await runButton.boundingBox();
    
    // Button should be below toggle on mobile
    expect(buttonBox?.y).toBeGreaterThan(toggleBox?.y || 0);
  });
});