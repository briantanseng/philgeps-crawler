#!/usr/bin/env node

import 'dotenv/config';
import PhilGEPSScraper from './scrapers/PhilGEPSScraper.js';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';

async function crawlAllPages() {
  console.log('PhilGEPS Full Crawler - Using HTTP Client');
  console.log('==========================================\n');

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
    
    const scraper = new PhilGEPSScraper();
    
    // Parse command line arguments
    let maxPages = 10; // Default
    
    if (process.argv.length === 3) {
      maxPages = parseInt(process.argv[2]);
      if (isNaN(maxPages) || maxPages < 1) {
        console.error('Invalid page number. Please provide a positive integer.');
        process.exit(1);
      }
    }
    
    console.log(`Starting crawl for ${maxPages} pages...\n`);
    
    const opportunities = await scraper.getOpportunitiesFromSearchPage(1, maxPages);
    
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