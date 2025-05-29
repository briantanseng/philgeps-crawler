#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import after dotenv is loaded
import { CrawlerService } from '../lib/crawler/crawlerService.js';

console.log('PhilGEPS Crawler Service');
console.log('========================\n');

const crawler = new CrawlerService();

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down crawler service...');
  crawler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down crawler service...');
  crawler.stop();
  process.exit(0);
});

// Start the crawler service
crawler.start();

// Keep the process alive
console.log('Crawler service is running. Press Ctrl+C to stop.\n');