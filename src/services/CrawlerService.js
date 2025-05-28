import PhilGEPSScraper from '../scrapers/PhilGEPSScraper.js';
import { Opportunity, db } from '../models/DatabaseAdapter.js';

class CrawlerService {
  constructor() {
    this.scraper = new PhilGEPSScraper();
    this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5;
  }

  async crawlAllOpportunities(options = {}) {
    const startTime = Date.now();
    const crawlStats = {
      opportunities_found: 0,
      new_opportunities: 0,
      updated_opportunities: 0,
      errors: 0
    };

    try {
      console.log('Starting crawl...');
      
      // Extract page range options
      const startPage = options.startPage || 1;
      const endPage = options.endPage || parseInt(process.env.MAX_PAGES_TO_CRAWL) || 20;
      
      console.log(`Crawling pages ${startPage} to ${endPage} of search results...`);
      const opportunities = await this.scraper.getOpportunitiesFromSearchPage(startPage, endPage);
      
      console.log(`Found ${opportunities.length} opportunities`);
      
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
      this.recordCrawlHistory({
        ...crawlStats,
        duration_seconds: duration,
        status: 'completed'
      });
      
      console.log(`Crawl completed in ${duration}s`);
      console.log(`Stats: ${JSON.stringify(crawlStats, null, 2)}`);
      
      return crawlStats;
    } catch (error) {
      console.error('Crawl failed:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      this.recordCrawlHistory({
        ...crawlStats,
        duration_seconds: duration,
        status: 'failed',
        errors: crawlStats.errors + 1
      });
      
      throw error;
    }
  }


  async recordCrawlHistory(stats) {
    if (process.env.USE_KNEX === 'true' || process.env.DATABASE_TYPE === 'postgres') {
      await db('crawl_history').insert(stats);
    } else {
      const stmt = db.prepare(`
        INSERT INTO crawl_history (
          opportunities_found, new_opportunities, updated_opportunities,
          errors, duration_seconds, status
        ) VALUES (
          @opportunities_found, @new_opportunities, @updated_opportunities,
          @errors, @duration_seconds, @status
        )
      `);
      
      stmt.run(stats);
    }
  }

  async getLastCrawlInfo() {
    if (process.env.USE_KNEX === 'true' || process.env.DATABASE_TYPE === 'postgres') {
      return await db('crawl_history')
        .orderBy('crawl_date', 'desc')
        .first();
    } else {
      const stmt = db.prepare(`
        SELECT * FROM crawl_history 
        ORDER BY crawl_date DESC 
        LIMIT 1
      `);
      
      return stmt.get();
    }
  }
}

export default CrawlerService;