#!/usr/bin/env node

import 'dotenv/config';
import CrawlerService from './services/CrawlerService.js';

async function main() {
  console.log('PhilGEPS Crawler - Starting manual crawl');
  console.log('========================================\n');

  const crawler = new CrawlerService();

  try {
    // Check last crawl
    const lastCrawl = await crawler.getLastCrawlInfo();
    if (lastCrawl) {
      console.log('Last crawl information:');
      console.log(`- Date: ${lastCrawl.crawl_date}`);
      console.log(`- Opportunities found: ${lastCrawl.opportunities_found}`);
      console.log(`- New opportunities: ${lastCrawl.new_opportunities}`);
      console.log(`- Duration: ${lastCrawl.duration_seconds}s`);
      console.log('');
    }

    // Start crawling
    console.log('Starting new crawl...\n');
    const stats = await crawler.crawlAllOpportunities();
    
    console.log('\nCrawl completed successfully!');
    console.log('Summary:');
    console.log(`- Total opportunities found: ${stats.opportunities_found}`);
    console.log(`- New opportunities: ${stats.new_opportunities}`);
    console.log(`- Updated opportunities: ${stats.updated_opportunities}`);
    console.log(`- Errors: ${stats.errors}`);

  } catch (error) {
    console.error('\nCrawl failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}