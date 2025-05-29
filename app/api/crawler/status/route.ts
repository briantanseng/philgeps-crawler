import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get crawler status from state file
    let crawlerStatus = {
      enabled: true,
      intervalMinutes: parseInt(process.env.CRAWL_INTERVAL_MINUTES || '60'),
      isRunning: false,
      lastCrawl: null as any,
      nextCrawl: null as Date | null,
    };
    
    // Try to read state file
    try {
      const fs = require('fs');
      const path = require('path');
      const stateFile = path.join(process.cwd(), 'data', 'crawler-state.json');
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        crawlerStatus.enabled = state.enabled ?? true;
        crawlerStatus.intervalMinutes = state.intervalMinutes || crawlerStatus.intervalMinutes;
      }
    } catch (error) {
      console.error('Error reading crawler state:', error);
    }
    
    // Get last crawl from database
    try {
      const lastCrawl = db.prepare(`
        SELECT * FROM crawl_history 
        ORDER BY crawl_date DESC 
        LIMIT 1
      `).get() as any;
      
      if (lastCrawl) {
        crawlerStatus.lastCrawl = {
          timestamp: lastCrawl.crawl_date,
          duration: lastCrawl.duration_seconds,
          status: lastCrawl.status,
          opportunitiesFound: lastCrawl.opportunities_found,
          newOpportunities: lastCrawl.new_opportunities,
          updatedOpportunities: lastCrawl.updated_opportunities,
          errors: lastCrawl.errors
        };
        
        // Calculate next crawl time if enabled
        if (crawlerStatus.enabled) {
          const lastCrawlTime = new Date(lastCrawl.crawl_date);
          const nextCrawlTime = new Date(lastCrawlTime.getTime() + crawlerStatus.intervalMinutes * 60 * 1000);
          crawlerStatus.nextCrawl = nextCrawlTime;
        }
      }
    } catch (error) {
      console.error('Error fetching crawl history:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: crawlerStatus
    });
  } catch (error: any) {
    console.error('Crawler status error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}