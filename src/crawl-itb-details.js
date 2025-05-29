#!/usr/bin/env node

import 'dotenv/config';
import ITBDetailScraper from './scrapers/ITBDetailScraper.js';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';
import { CrawlerErrorLogger } from './utils/ErrorLogger.js';
import { CrawlStateManager } from './utils/CrawlStateManager.js';

async function crawlITBDetails() {
  console.log('PhilGEPS ITB Details Crawler');
  console.log('============================\n');

  const startTime = Date.now();
  const stats = {
    total_opportunities: 0,
    processed: 0,
    with_itb_details: 0,
    errors: 0
  };
  
  // Initialize error logger
  const errorLogger = new CrawlerErrorLogger();
  await errorLogger.initialize();
  
  try {
    // Initialize database
    await initializeDatabase();
    
    const itbScraper = new ITBDetailScraper();
    
    // Get opportunities without ITB details
    console.log('Fetching opportunities without ITB details...');
    
    let opportunities;
    if (typeof db === 'function') {
      // Knex
      opportunities = await db('opportunities')
        .whereNull('itb_solicitation_number')
        .andWhere('detail_url', 'is not', null)
        .limit(process.argv[2] || 50)
        .select('*');
    } else {
      // better-sqlite3
      const stmt = db.prepare(`
        SELECT * FROM opportunities 
        WHERE itb_solicitation_number IS NULL 
        AND detail_url IS NOT NULL 
        LIMIT ?
      `);
      opportunities = stmt.all(process.argv[2] || 50);
    }
    
    stats.total_opportunities = opportunities.length;
    console.log(`Found ${opportunities.length} opportunities to process\n`);
    
    // Process each opportunity
    for (let i = 0; i < opportunities.length; i++) {
      const opportunity = opportunities[i];
      
      try {
        console.log(`\n[${i + 1}/${opportunities.length}] Processing ${opportunity.reference_number}`);
        console.log(`URL: ${opportunity.detail_url}`);
        
        // Extract ITB details
        const itbDetails = await itbScraper.extractITBDetails(opportunity.detail_url);
        
        // Check if we got meaningful ITB data
        const hasITBData = Object.values(itbDetails).some(value => value !== null && value !== undefined);
        
        if (hasITBData) {
          // Update the opportunity with ITB details
          if (typeof db === 'function') {
            // Knex
            await db('opportunities')
              .where('id', opportunity.id)
              .update({
                ...itbDetails,
                updated_at: new Date()
              });
          } else {
            // better-sqlite3
            const updateFields = Object.keys(itbDetails)
              .filter(key => itbDetails[key] !== null)
              .map(key => `${key} = @${key}`)
              .join(', ');
            
            if (updateFields) {
              const updateStmt = db.prepare(`
                UPDATE opportunities 
                SET ${updateFields}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = @id
              `);
              
              updateStmt.run({
                ...itbDetails,
                id: opportunity.id
              });
            }
          }
          
          stats.with_itb_details++;
          console.log('✅ ITB details extracted successfully');
          
          // Log some key details
          if (itbDetails.itb_solicitation_number) {
            console.log(`  - Solicitation: ${itbDetails.itb_solicitation_number}`);
          }
          if (itbDetails.itb_procurement_mode) {
            console.log(`  - Mode: ${itbDetails.itb_procurement_mode}`);
          }
          if (itbDetails.itb_area_of_delivery) {
            console.log(`  - Area: ${itbDetails.itb_area_of_delivery}`);
          }
        } else {
          console.log('⚠️  No ITB details found');
        }
        
        stats.processed++;
        
        // Add delay between requests
        if (i < opportunities.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${opportunity.reference_number}:`, error.message);
        await errorLogger.logCrawlError(
          opportunity.detail_url,
          error,
          {
            referenceNumber: opportunity.reference_number,
            title: opportunity.title
          }
        );
        stats.errors++;
      }
    }
    
    // Summary
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n${'='.repeat(50)}`);
    console.log('Crawl Summary');
    console.log('='.repeat(50));
    console.log(`Total opportunities: ${stats.total_opportunities}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`With ITB details: ${stats.with_itb_details}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    
    // Finalize error log
    const logSummary = await errorLogger.finalize(stats);
    if (logSummary.errorCount > 0) {
      console.log(`\n⚠️  Error log created: ${logSummary.logFile}`);
    }
    
    // Close database connection
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }

  } catch (error) {
    console.error('\nCrawl failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    
    await errorLogger.logError('Main ITB crawl process', error);
    const logSummary = await errorLogger.finalize(stats);
    console.error(`\n❌ Error log created: ${logSummary.logFile}`);
    
    // Close database connection on error
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }
    
    process.exit(1);
  }
}

// Run
crawlITBDetails();