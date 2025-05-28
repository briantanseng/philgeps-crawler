#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import { Opportunity, initializeDatabase } from './models/DatabaseAdapter.js';

async function downloadSinglePage() {
  const pageNumber = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  console.log(`Downloading page ${pageNumber} with ITB details...`);
  console.log(`FETCH_ITB_DETAILS: ${process.env.FETCH_ITB_DETAILS}`);
  
  try {
    // Initialize database
    await initializeDatabase();
    
    // Create scraper instance
    const scraper = new PuppeteerScraper();
    
    // Crawl specified page
    const opportunities = await scraper.crawlPageRange(pageNumber, pageNumber);
    
    console.log(`\nFound ${opportunities.length} opportunities`);
    
    // Save each opportunity
    let savedCount = 0;
    let withAreaCount = 0;
    
    for (const opp of opportunities) {
      try {
        await Opportunity.insert(opp);
        savedCount++;
        if (opp.area_of_delivery) {
          withAreaCount++;
          console.log(`✓ ${opp.reference_number}: ${opp.area_of_delivery}`);
        } else {
          console.log(`✗ ${opp.reference_number}: No area`);
        }
      } catch (error) {
        console.error(`Failed to save ${opp.reference_number}:`, error.message);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Total opportunities: ${opportunities.length}`);
    console.log(`- Saved to database: ${savedCount}`);
    console.log(`- With area of delivery: ${withAreaCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

downloadSinglePage();