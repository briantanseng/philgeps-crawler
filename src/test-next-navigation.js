#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';

async function testNextNavigation() {
  console.log('Testing Next Button Navigation');
  console.log('==============================\n');

  const scraper = new PuppeteerScraper();
  
  try {
    // Test crawling pages 1-3
    console.log('Testing crawl of pages 1 to 3...\n');
    const opportunities = await scraper.crawlPageRange(1, 3);
    
    console.log(`\nTotal opportunities found: ${opportunities.length}`);
    
    // Show sample of opportunities from each page
    const pageGroups = {};
    opportunities.forEach(opp => {
      const page = opp.source_url || 'unknown';
      if (!pageGroups[page]) pageGroups[page] = [];
      pageGroups[page].push(opp.title);
    });
    
    console.log('\nOpportunities by page:');
    Object.keys(pageGroups).forEach(page => {
      console.log(`\nPage ${page}: ${pageGroups[page].length} opportunities`);
      pageGroups[page].slice(0, 3).forEach(title => {
        console.log(`  - ${title.substring(0, 60)}...`);
      });
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNextNavigation();