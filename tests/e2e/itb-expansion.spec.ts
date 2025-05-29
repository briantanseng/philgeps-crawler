import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('ITB Details and Expandable Rows', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    
    // Mock search results with ITB details
    const mockData = [
      utils.getMockOpportunityWithITB(),
      {
        ...utils.getMockOpportunityWithITB(),
        id: 2,
        reference_number: 'TEST-2025-002',
        title: 'Opportunity without ITB',
        hasItbDetails: false,
        hasRfqDetails: false,
        itb_solicitation_number: null,
        itb_procurement_mode: null
      },
      {
        ...utils.getMockOpportunityWithITB(),
        id: 3,
        reference_number: 'TEST-2025-003',
        title: 'Opportunity with RFQ',
        hasItbDetails: false,
        hasRfqDetails: true,
        itb_has_active_rfq: 'true',
        rfq_solicitation_number: 'RFQ-2025-003',
        rfq_title: 'Request for Quotation',
        rfq_status: 'Open',
        rfq_description: 'Test RFQ description'
      }
    ];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: mockData.length,
      total: mockData.length,
      data: mockData
    });
    
    // Perform search to show results
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
  });

  test('should display expand button only for rows with ITB/RFQ details', async ({ page }) => {
    // First row should have expand button (has ITB)
    const expandBtn1 = page.locator('table tbody tr:nth-child(1) button:has-text("▶")');
    await expect(expandBtn1).toBeVisible();
    
    // Second row should NOT have expand button (no ITB/RFQ)
    const expandBtn2 = page.locator('table tbody tr:nth-child(2) button');
    await expect(expandBtn2).not.toBeVisible();
    
    // Third row should have expand button (has RFQ)
    const expandBtn3 = page.locator('table tbody tr:nth-child(3) button:has-text("▶")');
    await expect(expandBtn3).toBeVisible();
  });

  test('should show ITB badge for opportunities with details', async ({ page }) => {
    // First row should have ITB badge
    const badge1 = page.locator('table tbody tr:nth-child(1) .bg-blue-100:has-text("ITB")');
    await expect(badge1).toBeVisible();
    
    // Second row should NOT have ITB badge
    const badge2 = page.locator('table tbody tr:nth-child(2) .bg-blue-100');
    await expect(badge2).not.toBeVisible();
    
    // Third row should have ITB badge (RFQ also shows badge)
    const badge3 = page.locator('table tbody tr:nth-child(3) .bg-blue-100:has-text("ITB")');
    await expect(badge3).toBeVisible();
  });

  test('should expand row and show ITB details', async ({ page }) => {
    // Click expand button on first row
    const expandBtn = page.locator('table tbody tr:nth-child(1) button:has-text("▶")');
    await expandBtn.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Button should now show collapsed state
    await expect(page.locator('table tbody tr:nth-child(1) button:has-text("▼")')).toBeVisible();
    
    // ITB details should be visible
    const itbDetails = page.locator('.bg-white:has-text("Invitation to Bid Details")');
    await expect(itbDetails).toBeVisible();
    
    // Check specific ITB fields
    await expect(page.locator('text=Solicitation Number')).toBeVisible();
    await expect(page.locator('text=ITB-TEST-2025-001')).toBeVisible();
    
    await expect(page.locator('text=Procurement Mode')).toBeVisible();
    await expect(page.locator('text=Public Bidding')).toBeVisible();
    
    await expect(page.locator('text=Contact Person')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should collapse expanded row', async ({ page }) => {
    // Expand first row
    await utils.expandRow(0);
    await expect(await utils.isRowExpanded(0)).toBe(true);
    
    // Click to collapse
    const collapseBtn = page.locator('table tbody tr:nth-child(1) button:has-text("▼")');
    await collapseBtn.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Should be collapsed
    await expect(await utils.isRowExpanded(0)).toBe(false);
    
    // ITB details should not be visible
    const itbDetails = page.locator('.bg-white:has-text("Invitation to Bid Details")');
    await expect(itbDetails).not.toBeVisible();
  });

  test('should display all ITB fields when available', async ({ page }) => {
    // Expand first row
    await utils.expandRow(0);
    
    // Get ITB details
    const details = await utils.getITBDetails(0);
    
    // Verify key fields are present
    expect(details['Solicitation Number']).toBe('ITB-TEST-2025-001');
    expect(details['Procurement Mode']).toBe('Public Bidding');
    expect(details['Trade Agreement']).toBe('Implementing Entity');
    expect(details['Classification']).toBe('Goods');
    expect(details['Delivery Period']).toBe('30 calendar days');
    expect(details['Contact Person']).toBe('John Doe');
    expect(details['Contact Email']).toBe('john.doe@testagency.gov.ph');
    expect(details['Contact Phone']).toBe('(02) 8888-1234');
    expect(details['Pre-bid Conference']).toBe('June 15, 2025 10:00 AM');
    expect(details['Bid Documents Fee']).toBe('PHP 5,000.00');
  });

  test('should show RFQ details when available', async ({ page }) => {
    // Expand third row (has RFQ)
    await utils.expandRow(2);
    
    // RFQ details should be visible
    const rfqDetails = page.locator('.bg-white:has-text("RFQ Details")');
    await expect(rfqDetails).toBeVisible();
    
    // Check RFQ indicator
    await expect(page.locator('text=This opportunity has an active RFQ')).toBeVisible();
    
    // Check RFQ fields
    await expect(page.locator('text=RFQ Solicitation Number')).toBeVisible();
    await expect(page.locator('text=RFQ-2025-003')).toBeVisible();
  });

  test('should handle multiple expanded rows', async ({ page }) => {
    // Expand first row
    await utils.expandRow(0);
    await expect(await utils.isRowExpanded(0)).toBe(true);
    
    // Expand third row
    await utils.expandRow(2);
    await expect(await utils.isRowExpanded(2)).toBe(true);
    
    // Both should remain expanded
    await expect(await utils.isRowExpanded(0)).toBe(true);
    await expect(await utils.isRowExpanded(2)).toBe(true);
    
    // Both detail sections should be visible
    const itbSections = await page.locator('.bg-white:has-text("Details")').count();
    expect(itbSections).toBe(2);
  });

  test('should maintain expansion state during pagination', async ({ page }) => {
    // Mock larger dataset
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
    
    // Re-search to get new data
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Expand first row
    await utils.expandRow(0);
    await expect(await utils.isRowExpanded(0)).toBe(true);
    
    // Go to next page
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);
    
    // Go back to first page
    await page.locator('button:has-text("Previous")').click();
    await page.waitForTimeout(500);
    
    // First row should still be expanded
    await expect(await utils.isRowExpanded(0)).toBe(true);
  });

  test('should show cursor pointer for expandable rows', async ({ page }) => {
    // Get cursor style for expandable row
    const row1 = page.locator('table tbody tr:nth-child(1)');
    const cursor1 = await row1.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor1).toBe('pointer');
    
    // Non-expandable row should not have pointer cursor
    const row2 = page.locator('table tbody tr:nth-child(2)');
    const cursor2 = await row2.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor2).not.toBe('pointer');
  });

  test('should have smooth animations', async ({ page }) => {
    // Check expand button has transition
    const expandBtn = page.locator('table tbody tr:nth-child(1) button').first();
    const transition = await expandBtn.evaluate(el => 
      window.getComputedStyle(el).transition
    );
    expect(transition).toContain('200ms');
    
    // Expand and check animation class
    await expandBtn.click();
    
    // Check if expanded content has animation
    const expandedContent = page.locator('.animate-in');
    await expect(expandedContent).toBeVisible();
  });

  test('should display ITB description and eligibility when present', async ({ page }) => {
    // Expand first row
    await utils.expandRow(0);
    
    // Check for description section
    const description = page.locator('text=This is a test ITB description with detailed requirements.');
    await expect(description).toBeVisible();
    
    // Check for eligibility section
    const eligibility = page.locator('text=Must be registered with PhilGEPS');
    await expect(eligibility).toBeVisible();
  });

  test('should handle missing ITB fields gracefully', async ({ page }) => {
    // Mock data with partial ITB details
    const mockData = [{
      ...utils.getMockOpportunityWithITB(),
      itb_contact_email: null,
      itb_contact_phone: null,
      itb_pre_bid_conference: null,
      itb_description: null
    }];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 1,
      total: 1,
      data: mockData
    });
    
    // Re-search
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    
    // Expand row
    await utils.expandRow(0);
    
    // Should still show available fields
    await expect(page.locator('text=Solicitation Number')).toBeVisible();
    await expect(page.locator('text=Procurement Mode')).toBeVisible();
    
    // Missing fields should not be displayed
    await expect(page.locator('text=Contact Email').locator('..')).not.toContainText('@');
  });

  test('should have accessible expand buttons', async ({ page }) => {
    // Check expand button has proper attributes
    const expandBtn = page.locator('table tbody tr:nth-child(1) button').first();
    
    // Should have title attribute
    const title = await expandBtn.getAttribute('title');
    expect(title).toContain('Show ITB/RFQ details');
    
    // After clicking, title should change
    await expandBtn.click();
    const expandedTitle = await expandBtn.getAttribute('title');
    expect(expandedTitle).toContain('Hide details');
  });

  test('should display formatted budget in ITB details', async ({ page }) => {
    // Mock data with ITB budget
    const mockData = [{
      ...utils.getMockOpportunityWithITB(),
      itb_approved_budget: 2500000
    }];
    
    await utils.mockAPIResponse('/api/opportunities/search', {
      success: true,
      count: 1,
      total: 1,
      data: mockData
    });
    
    // Search and expand
    await page.locator('button:has-text("Search")').click();
    await utils.waitForTableResults();
    await utils.expandRow(0);
    
    // Check formatted budget
    const budget = page.locator('dd:has-text("₱")').first();
    await expect(budget).toBeVisible();
    await expect(budget).toContainText('₱2,500,000');
  });

  test('should handle keyboard navigation for expand buttons', async ({ page }) => {
    // Tab to first expand button
    await page.keyboard.press('Tab');
    // Continue tabbing until we reach the expand button
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused?.includes('▶')) break;
      await page.keyboard.press('Tab');
    }
    
    // Press Enter to expand
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Should be expanded
    await expect(await utils.isRowExpanded(0)).toBe(true);
  });
});