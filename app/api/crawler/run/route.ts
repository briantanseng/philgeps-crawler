import { NextResponse } from 'next/server';
import CrawlerService from '@/src/services/CrawlerService.js';

// Track if crawler is currently running (in-memory for now)
let isRunning = false;

export async function POST() {
  try {
    if (isRunning) {
      return NextResponse.json({
        success: false,
        error: 'Crawler is already running'
      }, { status: 400 });
    }
    
    // Set running state
    isRunning = true;
    
    // Run crawler in background (don't await)
    runCrawler().catch(console.error);
    
    return NextResponse.json({
      success: true,
      message: 'Crawler started successfully'
    });
  } catch (error: any) {
    console.error('Crawler run error:', error);
    isRunning = false;
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function runCrawler() {
  try {
    const crawler = new CrawlerService();
    await crawler.crawlAllOpportunities();
  } finally {
    isRunning = false;
  }
}