#!/usr/bin/env node

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PuppeteerScraper from './scrapers/PuppeteerScraper.js';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class FullDownloader {
  constructor() {
    this.scraper = new PuppeteerScraper();
    this.stateFile = path.join(__dirname, '../data/download-state.json');
    this.batchSize = parseInt(process.env.DOWNLOAD_BATCH_SIZE) || 10;
    this.baseDelay = parseInt(process.env.REQUEST_DELAY_MS) || 5000;
    this.maxJitter = parseInt(process.env.MAX_JITTER_MS) || 3000;
    this.pauseBetweenBatches = parseInt(process.env.BATCH_PAUSE_MS) || 30000; // 30 seconds
    this.pageRetryAttempts = parseInt(process.env.PAGE_RETRY_ATTEMPTS) || 3;
    this.retryMultiplier = parseInt(process.env.PAGE_RETRY_MULTIPLIER) || 2;
  }

  // Add random jitter to delay
  getDelayWithJitter() {
    const jitter = Math.floor(Math.random() * this.maxJitter);
    const delay = this.baseDelay + jitter;
    return delay;
  }

  // Load progress state
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Default state if file doesn't exist
      return {
        lastCompletedPage: 0,
        totalPages: null,
        totalOpportunities: 0,
        startedAt: new Date().toISOString(),
        batches: []
      };
    }
  }

  // Save progress state
  async saveState(state) {
    const dir = path.dirname(this.stateFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }

  // Get total pages from the website
  async getTotalPages() {
    console.log('Fetching total page count...');
    const scraper = new PuppeteerScraper();
    
    try {
      // Create a custom scraper to get page info
      const browser = await scraper.launchBrowser();
      const page = await browser.newPage();
      
      // Set page timeout
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      console.log('Navigating to search page to detect total pages...');
      await page.goto(scraper.searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get total number of opportunities and pages
      const totalInfo = await page.evaluate(() => {
        const infoText = document.body.innerText;
        const oppMatch = infoText.match(/(\d+[,\d]*)\s+opportunities found/);
        const totalOpps = oppMatch ? parseInt(oppMatch[1].replace(/,/g, '')) : 0;
        
        // Find total pages from pagination
        const pageLinks = Array.from(document.querySelectorAll('a')).filter(a => /^\d+$/.test(a.innerText.trim()));
        const pageNumbers = pageLinks.map(a => parseInt(a.innerText.trim()));
        const totalPages = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
        
        return { totalOpps, totalPages };
      });
      
      await browser.close();
      
      console.log(`Total opportunities available: ${totalInfo.totalOpps}`);
      console.log(`Total pages detected: ${totalInfo.totalPages}`);
      
      // If pagination shows limited pages, calculate based on opportunities
      // Assuming 20-25 opportunities per page
      if (totalInfo.totalPages < 10 && totalInfo.totalOpps > 100) {
        const estimatedPages = Math.ceil(totalInfo.totalOpps / 20);
        console.log(`Pagination limited, estimated total pages: ${estimatedPages}`);
        return parseInt(process.env.TOTAL_PAGES) || estimatedPages;
      }
      
      return totalInfo.totalPages;
    } catch (error) {
      console.error('Failed to get total pages:', error.message);
      // Return a safe default based on environment or conservative estimate
      return parseInt(process.env.TOTAL_PAGES) || 100;
    }
  }

  // Download a single page with retry
  async downloadPage(pageNumber) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.pageRetryAttempts; attempt++) {
      try {
        const delay = this.getDelayWithJitter();
        console.log(`Page ${pageNumber} - Attempt ${attempt}/${this.pageRetryAttempts} (delay: ${delay}ms)`);
        
        // Add delay before attempt
        if (attempt > 1) {
          const retryDelay = delay * Math.pow(this.retryMultiplier, attempt - 1); // Exponential backoff
          console.log(`Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        const opportunities = await this.scraper.crawlPageRange(pageNumber, pageNumber);
        console.log(`Page ${pageNumber} - Success! Found ${opportunities.length} opportunities`);
        return opportunities;
        
      } catch (error) {
        lastError = error;
        console.error(`Page ${pageNumber} - Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.pageRetryAttempts) {
          console.log(`Page ${pageNumber} - Will retry...`);
        }
      }
    }
    
    // All attempts failed
    console.error(`Page ${pageNumber} - Failed after ${this.pageRetryAttempts} attempts`);
    throw lastError;
  }

  // Download a batch of pages
  async downloadBatch(startPage, endPage, state) {
    const batchStart = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Downloading batch: Pages ${startPage} to ${endPage}`);
    console.log(`${'='.repeat(60)}\n`);

    let allOpportunities = [];
    let successfulPages = 0;
    let failedPages = [];
    
    try {
      // For PhilGEPS, it's more efficient to crawl the range in one go
      // since we need to navigate sequentially anyway
      console.log(`Crawling page range ${startPage}-${endPage} in a single session...`);
      
      const opportunities = await this.scraper.crawlPageRange(startPage, endPage);
      allOpportunities = opportunities;
      
      // Assume all pages were successful if we got opportunities
      if (opportunities.length > 0) {
        successfulPages = endPage - startPage + 1;
        state.lastCompletedPage = endPage;
        await this.saveState(state);
      } else {
        // If no opportunities, mark all as failed
        for (let p = startPage; p <= endPage; p++) {
          failedPages.push(p);
        }
      }
      
    } catch (error) {
      console.error(`\nBatch crawl failed: ${error.message}`);
      
      // Fall back to individual page downloads
      console.log('Falling back to individual page downloads...');
      
      for (let page = startPage; page <= endPage; page++) {
        // Skip if we already marked this page as completed
        if (page <= state.lastCompletedPage) {
          successfulPages++;
          continue;
        }
        
        try {
          const opportunities = await this.downloadPage(page);
          allOpportunities.push(...opportunities);
          successfulPages++;
          
          // Update state after each successful page
          state.lastCompletedPage = page;
          await this.saveState(state);
          
        } catch (error) {
          console.error(`\nFailed to download page ${page} after all retries`);
          failedPages.push(page);
          
          // Continue with next page even if this one failed
          continue;
        }
        
        // Add small delay between pages
        if (page < endPage) {
          const interPageDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
          await new Promise(resolve => setTimeout(resolve, interPageDelay));
        }
      }
    }
    
    // Save opportunities to database
    let saved = 0;
    let saveErrors = 0;
    
    for (const opportunity of allOpportunities) {
      try {
        await Opportunity.insert(opportunity);
        saved++;
      } catch (error) {
        console.error(`Error saving opportunity ${opportunity.reference_number}:`, error.message);
        saveErrors++;
      }
    }

    const batchTime = ((Date.now() - batchStart) / 1000).toFixed(2);
    
    // Update state
    state.totalOpportunities += saved;
    state.batches.push({
      startPage,
      endPage,
      pagesAttempted: endPage - startPage + 1,
      pagesSuccessful: successfulPages,
      pagesFailed: failedPages.length,
      failedPages: failedPages,
      opportunities: allOpportunities.length,
      saved,
      saveErrors,
      duration: batchTime,
      completedAt: new Date().toISOString()
    });

    console.log(`\nBatch summary:`);
    console.log(`- Pages: ${startPage}-${endPage}`);
    console.log(`- Pages successful: ${successfulPages}/${endPage - startPage + 1}`);
    if (failedPages.length > 0) {
      console.log(`- Failed pages: ${failedPages.join(', ')}`);
    }
    console.log(`- Opportunities found: ${allOpportunities.length}`);
    console.log(`- Saved to database: ${saved}`);
    console.log(`- Save errors: ${saveErrors}`);
    console.log(`- Duration: ${batchTime}s`);
    console.log(`- Total opportunities so far: ${state.totalOpportunities}`);

    // Consider batch successful if at least some pages were downloaded
    return successfulPages > 0;
  }

  // Main download function
  async downloadAll() {
    console.log('PhilGEPS Full Download Script');
    console.log('==============================\n');

    // Initialize database
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }

    // Load state
    const state = await this.loadState();
    
    // Get total pages if not known
    if (!state.totalPages) {
      state.totalPages = await this.getTotalPages();
      await this.saveState(state);
    }

    console.log(`\nDownload Configuration:`);
    console.log(`- Total pages: ${state.totalPages}`);
    console.log(`- Batch size: ${this.batchSize} pages`);
    console.log(`- Base delay: ${this.baseDelay}ms`);
    console.log(`- Max jitter: ${this.maxJitter}ms`);
    console.log(`- Pause between batches: ${this.pauseBetweenBatches}ms`);
    console.log(`- Starting from page: ${state.lastCompletedPage + 1}`);

    if (state.lastCompletedPage > 0) {
      console.log(`\nResuming from previous session:`);
      console.log(`- Last completed page: ${state.lastCompletedPage}`);
      console.log(`- Opportunities downloaded: ${state.totalOpportunities}`);
      console.log(`- Batches completed: ${state.batches.length}`);
    }

    // Calculate batches
    const remainingPages = state.totalPages - state.lastCompletedPage;
    const totalBatches = Math.ceil(remainingPages / this.batchSize);
    
    console.log(`\n${remainingPages} pages remaining (${totalBatches} batches)`);

    // Ask for confirmation
    if (!process.env.AUTO_CONFIRM) {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('\nProceed with download? (y/n): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('Download cancelled.');
        process.exit(0);
      }
    }

    // Start downloading
    console.log('\nStarting download...\n');
    const downloadStart = Date.now();
    let currentPage = state.lastCompletedPage + 1;
    let batchCount = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    while (currentPage <= state.totalPages) {
      const batchEnd = Math.min(currentPage + this.batchSize - 1, state.totalPages);
      
      // Download batch
      const success = await this.downloadBatch(currentPage, batchEnd, state);
      
      if (success) {
        consecutiveFailures = 0;
        batchCount++;
        
        // Save state after each successful batch
        await this.saveState(state);
        
        // Move to next batch
        currentPage = batchEnd + 1;
        
        // Pause between batches (except for the last one)
        if (currentPage <= state.totalPages) {
          const pauseWithJitter = this.pauseBetweenBatches + Math.floor(Math.random() * 10000);
          console.log(`\nPausing for ${(pauseWithJitter / 1000).toFixed(1)}s before next batch...\n`);
          await new Promise(resolve => setTimeout(resolve, pauseWithJitter));
        }
      } else {
        consecutiveFailures++;
        console.error(`\nFailure ${consecutiveFailures}/${maxConsecutiveFailures}`);
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error('\nToo many consecutive failures. Stopping download.');
          break;
        }
        
        // Wait longer before retry
        const retryDelay = this.pauseBetweenBatches * 2;
        console.log(`\nWaiting ${retryDelay / 1000}s before retry...\n`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // Show progress
      const progress = ((state.lastCompletedPage / state.totalPages) * 100).toFixed(2);
      console.log(`\nOverall Progress: ${state.lastCompletedPage}/${state.totalPages} pages (${progress}%)\n`);
    }

    // Collect all failed pages
    const allFailedPages = [];
    state.batches.forEach(batch => {
      if (batch.failedPages && batch.failedPages.length > 0) {
        allFailedPages.push(...batch.failedPages);
      }
    });

    // Retry failed pages if any
    if (allFailedPages.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log(`RETRYING ${allFailedPages.length} FAILED PAGES`);
      console.log('='.repeat(60) + '\n');
      
      const retryResults = {
        successful: [],
        failed: []
      };
      
      for (const pageNumber of allFailedPages) {
        try {
          console.log(`\nRetrying page ${pageNumber}...`);
          const opportunities = await this.downloadPage(pageNumber);
          
          // Save opportunities
          let saved = 0;
          for (const opportunity of opportunities) {
            try {
              await Opportunity.insert(opportunity);
              saved++;
            } catch (error) {
              console.error(`Error saving opportunity ${opportunity.reference_number}:`, error.message);
            }
          }
          
          state.totalOpportunities += saved;
          retryResults.successful.push(pageNumber);
          console.log(`Page ${pageNumber} - Retry successful! Saved ${saved} opportunities`);
          
        } catch (error) {
          retryResults.failed.push(pageNumber);
          console.error(`Page ${pageNumber} - Retry failed: ${error.message}`);
        }
        
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\nRetry summary:`);
      console.log(`- Successful: ${retryResults.successful.length} pages`);
      console.log(`- Failed: ${retryResults.failed.length} pages`);
      
      if (retryResults.failed.length > 0) {
        console.log(`\nFailed pages that could not be recovered:`);
        console.log(retryResults.failed.join(', '));
      }
    }

    // Final summary
    const totalTime = ((Date.now() - downloadStart) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('DOWNLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total time: ${totalTime} minutes`);
    console.log(`Pages downloaded: ${state.lastCompletedPage}/${state.totalPages}`);
    console.log(`Opportunities collected: ${state.totalOpportunities}`);
    console.log(`Batches completed: ${state.batches.length}`);
    
    if (state.lastCompletedPage > 0) {
      console.log(`Average opportunities per page: ${(state.totalOpportunities / state.lastCompletedPage).toFixed(2)}`);
    }
    
    // Calculate statistics
    if (state.batches.length > 0) {
      const avgBatchTime = state.batches.reduce((sum, b) => sum + parseFloat(b.duration), 0) / state.batches.length;
      const avgOppsPerBatch = state.batches.reduce((sum, b) => sum + b.opportunities, 0) / state.batches.length;
      const totalFailedPages = state.batches.reduce((sum, b) => sum + (b.pagesFailed || 0), 0);
      
      console.log(`Average batch time: ${avgBatchTime.toFixed(2)}s`);
      console.log(`Average opportunities per batch: ${avgOppsPerBatch.toFixed(2)}`);
      console.log(`Total failed pages: ${totalFailedPages}`);
    }

    // Close database connection
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }
  }
}

// Run the downloader
async function main() {
  const downloader = new FullDownloader();
  
  try {
    await downloader.downloadAll();
    process.exit(0);
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n\nDownload interrupted. Progress has been saved.');
  console.log('Run the script again to resume from where you left off.');
  process.exit(0);
});

main();