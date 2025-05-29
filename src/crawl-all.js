#!/usr/bin/env node

import 'dotenv/config';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import ITBDetailScraper from './scrapers/ITBDetailScraper.js';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';
import { CrawlerErrorLogger } from './utils/ErrorLogger.js';
import { CrawlStateManager } from './utils/CrawlStateManager.js';

// Configuration
const CONFIG = {
  BATCH_SIZE: 10, // Process opportunities in batches
  MAX_RETRIES: 3,
  BASE_DELAY: 2000, // Base delay in milliseconds
  MAX_JITTER: 1000, // Maximum jitter in milliseconds
  ITB_FETCH_DELAY: 1500, // Delay between ITB detail fetches
  ITB_MAX_JITTER: 500,
  PAGE_CRAWL_TIMEOUT: 60000, // 60 seconds timeout for page crawl
  ITB_CRAWL_TIMEOUT: 30000, // 30 seconds timeout for ITB details
};

// Module-level variables for SIGINT handler
let errorLogger;
let stateManager;
let globalStats = {
  pages_crawled: 0,
  opportunities_found: 0,
  new_opportunities: 0,
  updated_opportunities: 0,
  itb_details_fetched: 0,
  errors: 0,
  retries: 0,
  batches_processed: 0
};

// Utility functions
function getRandomJitter(maxJitter) {
  return Math.floor(Math.random() * maxJitter);
}

async function delay(ms, maxJitter = 0) {
  const jitter = getRandomJitter(maxJitter);
  const totalDelay = ms + jitter;
  console.log(`⏱️  Waiting ${totalDelay}ms (base: ${ms}ms, jitter: ${jitter}ms)`);
  return new Promise(resolve => setTimeout(resolve, totalDelay));
}

async function retryWithBackoff(fn, retries = CONFIG.MAX_RETRIES, context = '') {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      globalStats.retries++;
      
      if (attempt === retries) {
        console.error(`❌ Failed after ${retries} attempts: ${context}`);
        throw error;
      }
      
      const backoffDelay = CONFIG.BASE_DELAY * Math.pow(2, attempt - 1);
      console.warn(`⚠️  Attempt ${attempt}/${retries} failed for ${context}. Retrying in ${backoffDelay}ms...`);
      console.warn(`   Error: ${error.message}`);
      await delay(backoffDelay, CONFIG.MAX_JITTER);
    }
  }
}

class EnhancedCrawler {
  constructor() {
    this.scraper = null;
    this.itbScraper = null;
    this.currentBatch = [];
    this.batchStats = {
      processed: 0,
      new: 0,
      updated: 0,
      errors: 0,
      itb_fetched: 0
    };
  }

  async initialize() {
    await initializeDatabase();
    this.scraper = new PuppeteerScraper();
    this.itbScraper = new ITBDetailScraper();
    
    errorLogger = new CrawlerErrorLogger();
    await errorLogger.initialize();
    
    stateManager = new CrawlStateManager();
    await stateManager.initialize();
  }

  async crawlPage(pageNumber) {
    return await retryWithBackoff(
      async () => {
        console.log(`\n📄 Crawling page ${pageNumber}...`);
        const opportunities = await this.scraper.crawlPage(pageNumber);
        
        if (opportunities.length === 0) {
          console.log('No opportunities found on this page.');
          return [];
        }
        
        console.log(`✅ Found ${opportunities.length} opportunities on page ${pageNumber}`);
        globalStats.pages_crawled++;
        return opportunities;
      },
      CONFIG.MAX_RETRIES,
      `page ${pageNumber}`
    );
  }

  async fetchITBDetails(opportunity) {
    if (!opportunity.detail_url) {
      return opportunity;
    }

    return await retryWithBackoff(
      async () => {
        console.log(`   🔍 Fetching ITB details for ${opportunity.reference_number}...`);
        const itbDetails = await this.itbScraper.extractITBDetails(opportunity.detail_url);
        
        // Merge ITB details with opportunity
        const enrichedOpportunity = { ...opportunity, ...itbDetails };
        
        // Check if we got meaningful ITB data
        const hasITBData = Object.values(itbDetails).some(value => value !== null && value !== undefined);
        if (hasITBData) {
          globalStats.itb_details_fetched++;
          this.batchStats.itb_fetched++;
          console.log(`   ✅ ITB details fetched successfully`);
          
          // Log key ITB details
          if (itbDetails.itb_solicitation_number) {
            console.log(`      - Solicitation: ${itbDetails.itb_solicitation_number}`);
          }
          if (itbDetails.itb_procurement_mode) {
            console.log(`      - Mode: ${itbDetails.itb_procurement_mode}`);
          }
        } else {
          console.log(`   ⚠️  No ITB details found`);
        }
        
        return enrichedOpportunity;
      },
      2, // Fewer retries for ITB details
      `ITB details for ${opportunity.reference_number}`
    );
  }

  async processOpportunity(opportunity) {
    try {
      // Skip if already processed in this session
      if (stateManager.hasProcessed(opportunity.reference_number)) {
        console.log(`⏭️  Skipping already processed: ${opportunity.reference_number}`);
        return;
      }

      console.log(`\n🔄 Processing opportunity ${opportunity.reference_number}`);
      console.log(`   Title: ${opportunity.title.substring(0, 60)}${opportunity.title.length > 60 ? '...' : ''}`);

      // Fetch ITB details with delay and jitter
      await delay(CONFIG.ITB_FETCH_DELAY, CONFIG.ITB_MAX_JITTER);
      const enrichedOpportunity = await this.fetchITBDetails(opportunity);

      // Check if opportunity exists in database
      const existing = await Opportunity.findByReferenceNumber(opportunity.reference_number);

      // Save opportunity with ITB details
      await Opportunity.insert(enrichedOpportunity);

      // Update statistics
      if (existing) {
        globalStats.updated_opportunities++;
        this.batchStats.updated++;
      } else {
        globalStats.new_opportunities++;
        this.batchStats.new++;
      }
      globalStats.opportunities_found++;
      this.batchStats.processed++;

      // Record in state manager
      await stateManager.recordProcessedOpportunity(
        opportunity.reference_number,
        !existing
      );

      console.log(`   ✅ Successfully ${existing ? 'updated' : 'saved new'} opportunity`);

    } catch (error) {
      console.error(`   ❌ Error processing opportunity ${opportunity.reference_number}:`, error.message);
      
      await errorLogger.logCrawlError(
        opportunity.detail_url || opportunity.reference_number,
        error,
        {
          referenceNumber: opportunity.reference_number,
          title: opportunity.title,
          procuringEntity: opportunity.procuring_entity
        }
      );
      
      await stateManager.recordError(error, `Processing ${opportunity.reference_number}`);
      globalStats.errors++;
      this.batchStats.errors++;
    }
  }

  async processBatch(opportunities, batchNumber, pageNumber) {
    console.log(`\n📦 Processing batch ${batchNumber} (${opportunities.length} opportunities from page ${pageNumber})...`);
    
    // Reset batch stats
    this.batchStats = {
      processed: 0,
      new: 0,
      updated: 0,
      errors: 0,
      itb_fetched: 0
    };

    const batchStartTime = Date.now();

    for (const opportunity of opportunities) {
      await this.processOpportunity(opportunity);
    }

    const batchDuration = (Date.now() - batchStartTime) / 1000;
    globalStats.batches_processed++;

    // Print batch summary
    console.log(`\n📊 Batch ${batchNumber} Summary:`);
    console.log(`   Duration: ${batchDuration.toFixed(2)}s`);
    console.log(`   Processed: ${this.batchStats.processed}`);
    console.log(`   New: ${this.batchStats.new}`);
    console.log(`   Updated: ${this.batchStats.updated}`);
    console.log(`   ITB Details: ${this.batchStats.itb_fetched}`);
    console.log(`   Errors: ${this.batchStats.errors}`);
    console.log(`   Success Rate: ${((this.batchStats.processed - this.batchStats.errors) / this.batchStats.processed * 100).toFixed(1)}%`);
  }

  async crawl(startPage, endPage) {
    let currentPage = startPage;
    let hasMorePages = true;
    let batchNumber = 1;

    console.log(`\n🚀 Starting enhanced crawl from page ${startPage}${endPage ? ` to ${endPage}` : ' to end'}...`);
    console.log(`   Batch size: ${CONFIG.BATCH_SIZE} opportunities`);
    console.log(`   Max retries: ${CONFIG.MAX_RETRIES}`);
    console.log(`   Base delay: ${CONFIG.BASE_DELAY}ms with up to ${CONFIG.MAX_JITTER}ms jitter\n`);

    while (hasMorePages && (!endPage || currentPage <= endPage)) {
      try {
        // Update state
        await stateManager.updateState({ currentPage });

        // Crawl page with retry
        const opportunities = await this.crawlPage(currentPage);

        if (opportunities.length === 0) {
          hasMorePages = false;
          break;
        }

        // Process opportunities in batches
        for (let i = 0; i < opportunities.length; i += CONFIG.BATCH_SIZE) {
          const batch = opportunities.slice(i, i + CONFIG.BATCH_SIZE);
          await this.processBatch(batch, batchNumber++, currentPage);
          
          // Save state after each batch
          await stateManager.saveState();
        }

        // Mark page as completed
        await stateManager.completePage(currentPage);
        
        // Add delay between pages
        if (hasMorePages && (!endPage || currentPage < endPage)) {
          await delay(CONFIG.BASE_DELAY, CONFIG.MAX_JITTER);
        }

        currentPage++;

      } catch (pageError) {
        console.error(`\n❌ Fatal error on page ${currentPage}:`, pageError.message);
        await errorLogger.logError(`Crawling page ${currentPage}`, pageError);
        await stateManager.recordError(pageError, `Page ${currentPage}`);
        
        // Skip to next page
        currentPage++;
        globalStats.errors++;
      }
    }

    return currentPage - startPage;
  }
}

async function main() {
  console.log('PhilGEPS Enhanced Crawler v2.0');
  console.log('================================\n');

  const startTime = Date.now();
  const crawler = new EnhancedCrawler();

  try {
    await crawler.initialize();

    // Parse command line arguments
    let startPage = 1;
    let endPage = null;
    let shouldResume = false;

    // Check for --resume flag
    if (process.argv.includes('--resume')) {
      shouldResume = true;
      const resumeInfo = stateManager.getResumeInfo();
      if (resumeInfo) {
        startPage = resumeInfo.resumePage;
        endPage = resumeInfo.endPage;
        globalStats = { ...globalStats, ...resumeInfo.stats };
        console.log('📂 Resuming from previous state...');
        console.log(`   Last completed page: ${resumeInfo.resumePage - 1}`);
        console.log(`   Already processed: ${resumeInfo.processedCount} opportunities`);
        console.log(`   Previous stats:`, resumeInfo.stats);
      } else {
        console.log('No previous state found. Starting fresh.');
        shouldResume = false;
      }
    }

    // Check for --clean flag
    if (process.argv.includes('--clean')) {
      await stateManager.clearState();
      console.log('🧹 Cleared previous state. Starting fresh crawl...');
    }

    // Parse page arguments
    const args = process.argv.filter(arg => !arg.startsWith('--'));
    
    if (!shouldResume) {
      if (args.length === 3) {
        endPage = parseInt(args[2]);
        if (isNaN(endPage) || endPage < 1) {
          console.error('Invalid page number. Please provide a positive integer.');
          process.exit(1);
        }
      } else if (args.length === 4) {
        startPage = parseInt(args[2]);
        endPage = parseInt(args[3]);
        if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
          console.error('Invalid page range.');
          process.exit(1);
        }
      } else if (args.length > 4) {
        console.error('Too many arguments.');
        process.exit(1);
      } else {
        // Default to 10 pages
        endPage = 10;
      }
    }

    // Update state manager with crawl parameters
    await stateManager.updateState({
      startPage,
      endPage,
      currentPage: startPage
    });

    // Start crawling
    const pagesCrawled = await crawler.crawl(startPage, endPage);

    // Record crawl history
    const duration = (Date.now() - startTime) / 1000;
    
    // Save to database
    if (typeof db === 'function') {
      await db('crawl_history').insert({
        ...globalStats,
        duration_seconds: duration,
        status: 'completed',
        page_range: `${startPage}-${endPage || 'end'}`,
        fetch_details: true,
        created_at: new Date().toISOString()
      });
    } else {
      const stmt = db.prepare(`
        INSERT INTO crawl_history (
          opportunities_found, new_opportunities, updated_opportunities,
          errors, duration_seconds, status, page_range, fetch_details
        ) VALUES (
          @opportunities_found, @new_opportunities, @updated_opportunities,
          @errors, @duration_seconds, @status, @page_range, @fetch_details
        )
      `);
      
      stmt.run({
        ...globalStats,
        duration_seconds: duration,
        status: 'completed',
        page_range: `${startPage}-${endPage || 'end'}`,
        fetch_details: 1
      });
    }

    // Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CRAWL COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${duration.toFixed(2)}s`);
    console.log(`Pages Crawled: ${globalStats.pages_crawled}`);
    console.log(`Batches Processed: ${globalStats.batches_processed}`);
    console.log(`\nOpportunities:`);
    console.log(`  - Total Found: ${globalStats.opportunities_found}`);
    console.log(`  - New: ${globalStats.new_opportunities}`);
    console.log(`  - Updated: ${globalStats.updated_opportunities}`);
    console.log(`  - ITB Details Fetched: ${globalStats.itb_details_fetched}`);
    console.log(`\nPerformance:`);
    console.log(`  - Errors: ${globalStats.errors}`);
    console.log(`  - Retries: ${globalStats.retries}`);
    console.log(`  - Success Rate: ${((globalStats.opportunities_found - globalStats.errors) / globalStats.opportunities_found * 100).toFixed(1)}%`);
    console.log(`  - Avg Time per Opportunity: ${(duration / globalStats.opportunities_found).toFixed(2)}s`);

    // Mark as complete
    await stateManager.complete();

    // Finalize error log
    const logSummary = await errorLogger.finalize({
      ...globalStats,
      pageRange: `${startPage} to ${endPage || 'end'}`,
      duration
    });

    if (logSummary.errorCount > 0) {
      console.log(`\n⚠️  Error log created: ${logSummary.logFile}`);
    }

    // Close database
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }

  } catch (error) {
    console.error('\n❌ Crawl failed with fatal error:', error.message);
    console.error('Stack trace:', error.stack);

    if (errorLogger) {
      await errorLogger.logError('Main crawl process', error, {
        startPage: crawler.startPage,
        endPage: crawler.endPage,
        stats: globalStats
      });
      
      const logSummary = await errorLogger.finalize(globalStats);
      console.error(`\n❌ Error log created: ${logSummary.logFile}`);
    }

    if (typeof db.destroy === 'function') {
      await db.destroy();
    }

    process.exit(1);
  }
}

// Handle graceful shutdown
let isShuttingDown = false;
process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n\n🛑 Crawl interrupted. Saving state...');

  try {
    if (stateManager && stateManager.state) {
      await stateManager.saveState();
      console.log('✅ State saved successfully.');
      console.log('📌 Resume with: npm run crawl:all -- --resume');
    }

    if (errorLogger) {
      await errorLogger.finalize(globalStats);
    }

    if (typeof db.destroy === 'function') {
      await db.destroy();
    }

    console.log('\nShutdown complete. Goodbye! 👋');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }

  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the crawler
main();