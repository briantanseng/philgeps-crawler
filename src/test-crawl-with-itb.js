#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import { Opportunity, initializeDatabase } from './models/DatabaseAdapter.js';

async function testCrawlWithITB() {
  console.log('Testing Crawl with ITB Details');
  console.log('==============================');
  console.log(`FETCH_ITB_DETAILS: ${process.env.FETCH_ITB_DETAILS}`);
  
  try {
    // Initialize database
    await initializeDatabase();
    
    // Create scraper instance
    const scraper = new PuppeteerScraper();
    
    // Crawl just 1 page to test
    console.log('\nCrawling page 1 with ITB details...\n');
    const opportunities = await scraper.crawlPageRange(1, 1);
    
    console.log(`\nTotal opportunities found: ${opportunities.length}`);
    
    // Save to database
    let savedCount = 0;
    for (const opp of opportunities) {
      try {
        await Opportunity.insert(opp);
        savedCount++;
        console.log(`Saved: ${opp.reference_number} - Area: ${opp.area_of_delivery || 'Not specified'}`);
      } catch (error) {
        console.error(`Failed to save ${opp.reference_number}:`, error.message);
      }
    }
    
    console.log(`\nSaved ${savedCount} opportunities to database`);
    
    // Query to verify area_of_delivery was saved
    const withArea = await Opportunity.search('', { limit: 10 });
    const areasFound = withArea.filter(o => o.area_of_delivery).length;
    console.log(`\nOpportunities with area_of_delivery: ${areasFound}/${withArea.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testCrawlWithITB();