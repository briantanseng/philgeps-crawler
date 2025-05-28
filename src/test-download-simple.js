#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import { Opportunity, initializeDatabase } from './models/DatabaseAdapter.js';

async function testSimpleDownload() {
  console.log('Simple Download Test');
  console.log('===================\n');

  await initializeDatabase();
  const scraper = new PuppeteerScraper();
  
  try {
    // Test downloading pages 1-5
    console.log('Downloading pages 1-5...\n');
    const startTime = Date.now();
    
    const opportunities = await scraper.crawlPageRange(1, 5);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nDownload completed in ${duration}s`);
    console.log(`Total opportunities found: ${opportunities.length}`);
    
    // Save to database
    let saved = 0;
    let errors = 0;
    
    for (const opp of opportunities) {
      try {
        await Opportunity.insert(opp);
        saved++;
      } catch (error) {
        errors++;
      }
    }
    
    console.log(`Saved to database: ${saved}`);
    console.log(`Save errors: ${errors}`);
    
    // Show average
    console.log(`\nAverage opportunities per page: ${(opportunities.length / 5).toFixed(1)}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  process.exit(0);
}

testSimpleDownload();