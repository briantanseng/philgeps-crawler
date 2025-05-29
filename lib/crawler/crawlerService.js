import OriginalCrawlerService from '../../src/services/CrawlerService.js';
import Database from 'better-sqlite3';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

export class CrawlerService {
  constructor() {
    this.crawler = new OriginalCrawlerService();
    this.db = new Database(path.join(process.cwd(), 'data', 'philgeps.db'));
    this.intervalMinutes = parseInt(process.env.CRAWL_INTERVAL_MINUTES || '60');
    this.crawlerJob = null;
    this.isCrawling = false;
    this.enabled = true;
    this.stateFile = path.join(process.cwd(), 'data', 'crawler-state.json');
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        this.enabled = state.enabled ?? true;
        this.intervalMinutes = state.intervalMinutes || this.intervalMinutes;
      }
    } catch (error) {
      console.error('Error loading crawler state:', error);
    }
  }

  start() {
    const cronExpression = `*/${this.intervalMinutes} * * * *`;
    console.log(`Starting crawler service with interval: ${this.intervalMinutes} minutes`);
    
    this.crawlerJob = cron.schedule(cronExpression, async () => {
      // Reload state to check if enabled
      this.loadState();
      
      if (this.enabled && !this.isCrawling) {
        await this.runCrawl();
      } else if (!this.enabled) {
        console.log(`[${new Date().toISOString()}] Crawler is disabled, skipping scheduled crawl`);
      }
    });
  }

  stop() {
    if (this.crawlerJob) {
      this.crawlerJob.stop();
      this.crawlerJob = null;
    }
  }

  async runCrawl() {
    if (this.isCrawling) {
      console.log('Crawl already in progress, skipping...');
      return;
    }

    this.isCrawling = true;
    const startTime = new Date();
    
    try {
      console.log(`[${startTime.toISOString()}] Starting crawl...`);
      const stats = await this.crawler.crawlAllOpportunities();
      
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      // Log crawl stats
      console.log(`[${endTime.toISOString()}] Crawl completed in ${duration}s`);
      console.log(`Found: ${stats.totalFound}, New: ${stats.newRecords}, Updated: ${stats.updatedRecords}`);
      
      // Save crawl history
      this.saveCrawlHistory({
        crawl_date: startTime.toISOString(),
        opportunities_found: stats.totalFound,
        new_opportunities: stats.newRecords,
        updated_opportunities: stats.updatedRecords,
        errors: stats.errors || 0,
        duration_seconds: duration,
        status: 'completed'
      });
      
    } catch (error) {
      console.error('Crawl failed:', error);
      
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      this.saveCrawlHistory({
        crawl_date: startTime.toISOString(),
        opportunities_found: 0,
        new_opportunities: 0,
        updated_opportunities: 0,
        errors: 1,
        duration_seconds: duration,
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.isCrawling = false;
    }
  }

  saveCrawlHistory(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO crawl_history (
          crawl_date, opportunities_found, new_opportunities,
          updated_opportunities, errors, duration_seconds, status, error_message
        ) VALUES (
          @crawl_date, @opportunities_found, @new_opportunities,
          @updated_opportunities, @errors, @duration_seconds, @status, @error_message
        )
      `);
      
      stmt.run({
        ...data,
        error_message: data.error_message || null
      });
    } catch (error) {
      console.error('Failed to save crawl history:', error);
    }
  }
}