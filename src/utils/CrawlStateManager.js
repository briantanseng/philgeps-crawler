import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CrawlStateManager {
  constructor() {
    this.stateFile = path.join(__dirname, '../../data/crawl-state.json');
    this.state = null;
  }

  async initialize() {
    try {
      const stateData = await fs.readFile(this.stateFile, 'utf-8');
      this.state = JSON.parse(stateData);
      console.log('Resuming from previous state...');
      console.log(`Last completed page: ${this.state.lastCompletedPage}`);
      console.log(`Progress: ${this.state.processedOpportunities}/${this.state.totalOpportunities || '?'} opportunities`);
    } catch (error) {
      // No state file or invalid state, start fresh
      this.state = {
        startTime: new Date().toISOString(),
        startPage: 1,
        endPage: null,
        lastCompletedPage: 0,
        currentPage: 1,
        processedOpportunities: 0,
        totalOpportunities: 0,
        stats: {
          pages_crawled: 0,
          opportunities_found: 0,
          new_opportunities: 0,
          updated_opportunities: 0,
          itb_details_fetched: 0,
          errors: 0,
          retries: 0,
          batches_processed: 0
        },
        processedReferences: [],
        errorLog: [],
        lastBatchNumber: 0,
        currentBatch: []
      };
    }
  }

  async updateState(updates) {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    await this.saveState();
  }

  async saveState() {
    const dataDir = path.dirname(this.stateFile);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  async recordProcessedOpportunity(referenceNumber, isNew = false) {
    this.state.processedOpportunities++;
    this.state.stats.opportunities_found++;
    
    if (isNew) {
      this.state.stats.new_opportunities++;
    } else {
      this.state.stats.updated_opportunities++;
    }
    
    // Keep track of last 1000 processed references to avoid duplicates
    this.state.processedReferences.push(referenceNumber);
    if (this.state.processedReferences.length > 1000) {
      this.state.processedReferences = this.state.processedReferences.slice(-1000);
    }
    
    // Update current batch
    if (!this.state.currentBatch) {
      this.state.currentBatch = [];
    }
    this.state.currentBatch.push(referenceNumber);
    
    // Save state every 10 opportunities
    if (this.state.processedOpportunities % 10 === 0) {
      await this.saveState();
    }
  }

  async recordError(error, context) {
    this.state.stats.errors++;
    this.state.errorLog.push({
      timestamp: new Date().toISOString(),
      context,
      error: error.message
    });
    
    // Keep only last 100 errors in state
    if (this.state.errorLog.length > 100) {
      this.state.errorLog = this.state.errorLog.slice(-100);
    }
    
    await this.saveState();
  }

  async completePage(pageNumber) {
    this.state.lastCompletedPage = pageNumber;
    this.state.currentPage = pageNumber + 1;
    await this.saveState();
    console.log(`✓ Completed page ${pageNumber}`);
  }

  async complete() {
    this.state.completedTime = new Date().toISOString();
    this.state.isComplete = true;
    await this.saveState();
  }

  async clearState() {
    try {
      await fs.unlink(this.stateFile);
      console.log('Cleared previous crawl state');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  getResumeInfo() {
    if (!this.state || this.state.lastCompletedPage === 0) {
      return null;
    }
    
    return {
      resumePage: this.state.lastCompletedPage + 1,
      endPage: this.state.endPage,
      processedCount: this.state.processedOpportunities,
      stats: this.state.stats
    };
  }

  hasProcessed(referenceNumber) {
    return this.state.processedReferences.includes(referenceNumber);
  }
}

export class DownloadStateManager {
  constructor() {
    this.stateFile = path.join(__dirname, '../../data/download-state.json');
    this.state = null;
  }

  async initialize() {
    try {
      const stateData = await fs.readFile(this.stateFile, 'utf-8');
      this.state = JSON.parse(stateData);
      console.log('Resuming download from previous state...');
      console.log(`Downloaded: ${this.state.downloadedFiles.length} files`);
      console.log(`Failed: ${this.state.failedDownloads.length} files`);
    } catch (error) {
      // No state file, start fresh
      this.state = {
        startTime: new Date().toISOString(),
        downloadedFiles: [],
        failedDownloads: [],
        currentBatch: [],
        stats: {
          totalFiles: 0,
          downloaded: 0,
          failed: 0,
          skipped: 0,
          bytesDownloaded: 0
        }
      };
    }
  }

  async recordDownload(url, filePath, size = 0) {
    this.state.downloadedFiles.push({
      url,
      filePath,
      size,
      timestamp: new Date().toISOString()
    });
    
    this.state.stats.downloaded++;
    this.state.stats.bytesDownloaded += size;
    
    // Save state every 5 downloads
    if (this.state.stats.downloaded % 5 === 0) {
      await this.saveState();
    }
  }

  async recordFailure(url, error, attemptNumber = 1) {
    const failure = {
      url,
      error: error.message,
      attemptNumber,
      timestamp: new Date().toISOString()
    };
    
    // Check if this URL has failed before
    const existingFailure = this.state.failedDownloads.find(f => f.url === url);
    if (existingFailure) {
      existingFailure.attempts = (existingFailure.attempts || 1) + 1;
      existingFailure.lastError = error.message;
      existingFailure.lastAttempt = new Date().toISOString();
    } else {
      this.state.failedDownloads.push({
        ...failure,
        attempts: 1
      });
    }
    
    this.state.stats.failed++;
    await this.saveState();
  }

  async saveState() {
    const dataDir = path.dirname(this.stateFile);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  hasDownloaded(url) {
    return this.state.downloadedFiles.some(file => file.url === url);
  }

  getFailedUrls() {
    return this.state.failedDownloads
      .filter(f => f.attempts < 3) // Only retry if less than 3 attempts
      .map(f => f.url);
  }

  async complete() {
    this.state.completedTime = new Date().toISOString();
    this.state.isComplete = true;
    await this.saveState();
    
    console.log('\nDownload Summary:');
    console.log(`- Total files: ${this.state.stats.totalFiles}`);
    console.log(`- Downloaded: ${this.state.stats.downloaded}`);
    console.log(`- Failed: ${this.state.stats.failed}`);
    console.log(`- Skipped: ${this.state.stats.skipped}`);
    console.log(`- Total size: ${(this.state.stats.bytesDownloaded / 1024 / 1024).toFixed(2)} MB`);
  }

  async clearState() {
    try {
      await fs.unlink(this.stateFile);
      console.log('Cleared previous download state');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }
}