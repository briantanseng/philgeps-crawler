#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';

async function crawlAllPages() {
  console.log('PhilGEPS Full Crawler - Using Puppeteer');
  console.log('========================================\n');

  const startTime = Date.now();
  const crawlStats = {
    opportunities_found: 0,
    new_opportunities: 0,
    updated_opportunities: 0,
    errors: 0
  };

  try {
    // Initialize database
    await initializeDatabase();
    
    const scraper = new PuppeteerScraper();
    
    // Parse command line arguments
    let startPage = 1;
    let endPage = null;
    
    if (process.argv.length === 3) {
      // Single argument: crawl from page 1 to specified page
      endPage = parseInt(process.argv[2]);
      if (isNaN(endPage) || endPage < 1) {
        console.error('Invalid page number. Please provide a positive integer.');
        process.exit(1);
      }
    } else if (process.argv.length === 4) {
      // Two arguments: crawl from start page to end page
      startPage = parseInt(process.argv[2]);
      endPage = parseInt(process.argv[3]);
      
      if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
        console.error('Invalid page range. Usage: npm run crawl:all [startPage] [endPage]');
        console.error('Example: npm run crawl:all 5 10');
        process.exit(1);
      }
    } else if (process.argv.length > 4) {
      console.error('Too many arguments.');
      console.error('Usage: npm run crawl:all [endPage] or npm run crawl:all [startPage] [endPage]');
      process.exit(1);
    } else {
      // No arguments: default to crawling 10 pages
      endPage = 10;
    }
    
    if (endPage) {
      console.log(`Starting crawl from page ${startPage} to page ${endPage}...\n`);
    } else {
      console.log(`Starting crawl from page ${startPage} to end...\n`);
    }
    
    const opportunities = await scraper.crawlPageRange(startPage, endPage);
    
    console.log(`\nTotal opportunities extracted: ${opportunities.length}`);
    console.log('Saving to database...\n');

    // Process opportunities
    for (const opportunity of opportunities) {
      try {
        // Check if opportunity exists
        const existing = await Opportunity.findByReferenceNumber(opportunity.reference_number);
        
        if (existing) {
          crawlStats.updated_opportunities++;
        } else {
          crawlStats.new_opportunities++;
        }
        
        // Save opportunity
        await Opportunity.insert(opportunity);
        crawlStats.opportunities_found++;
        
      } catch (error) {
        console.error(`Error processing opportunity ${opportunity.reference_number}:`, error.message);
        crawlStats.errors++;
      }
    }

    // Record crawl history
    const duration = (Date.now() - startTime) / 1000;
    
    // Handle both Knex and better-sqlite3
    if (typeof db === 'function') {
      // Knex
      await db('crawl_history').insert({
        ...crawlStats,
        duration_seconds: duration,
        status: 'completed',
        created_at: new Date().toISOString()
      });
    } else {
      // better-sqlite3
      const stmt = db.prepare(`
        INSERT INTO crawl_history (
          opportunities_found, new_opportunities, updated_opportunities,
          errors, duration_seconds, status
        ) VALUES (
          @opportunities_found, @new_opportunities, @updated_opportunities,
          @errors, @duration_seconds, @status
        )
      `);
      
      stmt.run({
        ...crawlStats,
        duration_seconds: duration,
        status: 'completed'
      });
    }
    
    console.log(`\nCrawl completed in ${duration.toFixed(2)}s`);
    console.log('Summary:');
    console.log(`- Total opportunities found: ${crawlStats.opportunities_found}`);
    console.log(`- New opportunities: ${crawlStats.new_opportunities}`);
    console.log(`- Updated opportunities: ${crawlStats.updated_opportunities}`);
    console.log(`- Errors: ${crawlStats.errors}`);
    
    // Close database connection
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }

  } catch (error) {
    console.error('\nCrawl failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Close database connection on error
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }
    
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n\nCrawl interrupted.');
  
  // Close database connection
  if (typeof db.destroy === 'function') {
    await db.destroy();
  }
  
  process.exit(0);
});

// Run
crawlAllPages();