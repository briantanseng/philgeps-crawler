#!/usr/bin/env node

import 'dotenv/config';
import cron from 'node-cron';
import CrawlerService from './services/CrawlerService.js';
import express from 'express';
import cors from 'cors';
import apiRouter from './api/routes.js';
import { initializeDatabase } from './models/DatabaseAdapter.js';

class PhilGEPSApp {
  constructor() {
    this.crawler = new CrawlerService();
    this.app = express();
    this.intervalMinutes = parseInt(process.env.CRAWL_INTERVAL_MINUTES) || 60;
    this.port = process.env.PORT || 3000;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async initialize() {
    console.log('PhilGEPS Crawler Application');
    console.log('============================\n');

    // Initialize database
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }

    // Set up Express
    this.setupExpress();

    // Schedule crawler
    this.scheduleCrawler();

    // Start server
    this.startServer();

    // Run initial crawl
    const runInitialCrawl = await this.askForInitialCrawl();
    if (runInitialCrawl) {
      this.runCrawl();
    }
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api', apiRouter);

    // Serve static files for simple web UI
    this.app.use(express.static('public'));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });
  }

  scheduleCrawler() {
    // Convert minutes to cron expression
    const cronExpression = `*/${this.intervalMinutes} * * * *`;
    
    console.log(`Scheduling crawler to run every ${this.intervalMinutes} minutes`);
    console.log(`Cron expression: ${cronExpression}\n`);

    cron.schedule(cronExpression, () => {
      console.log(`[${new Date().toISOString()}] Starting scheduled crawl...`);
      this.runCrawl();
    });
  }

  async runCrawl() {
    try {
      const stats = await this.crawler.crawlAllOpportunities();
      console.log(`[${new Date().toISOString()}] Crawl completed:`, stats);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Crawl failed:`, error.message);
    }
  }

  startServer() {
    this.app.listen(this.port, () => {
      console.log(`API server running on http://localhost:${this.port}`);
      console.log(`Web UI available at http://localhost:${this.port}\n`);
    });
  }

  askForInitialCrawl() {
    return new Promise(async (resolve) => {
      // In production or if explicitly set, use environment variable
      if (this.isProduction || process.env.RUN_INITIAL_CRAWL) {
        resolve(process.env.RUN_INITIAL_CRAWL === 'true');
        return;
      }

      // In development, ask interactively
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Run initial crawl now? (y/n): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new PhilGEPSApp();
  app.initialize().catch(console.error);
}