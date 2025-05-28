#!/usr/bin/env node

import 'dotenv/config';
import { Opportunity, db, initializeDatabase } from './models/DatabaseAdapter.js';
import RFQDetailScraper from './scrapers/RFQDetailScraper.js';

async function enrichRFQDetails() {
  console.log('RFQ Details Enrichment Script');
  console.log('=============================\n');

  try {
    await initializeDatabase();
    
    const rfqScraper = new RFQDetailScraper();
    
    // Get opportunities that might need RFQ details
    const opportunities = await Opportunity.search('', { 
      limit: 100,
      activeOnly: true 
    });
    
    console.log(`Found ${opportunities.length} active opportunities to check\n`);
    
    let enriched = 0;
    let failed = 0;
    
    for (const opp of opportunities) {
      // Skip if already has RFQ details
      if (opp.rfq_number || opp.procurement_mode) {
        console.log(`Skipping ${opp.reference_number} - already has RFQ details`);
        continue;
      }
      
      // Skip if no detail URL
      if (!opp.detail_url) {
        console.log(`Skipping ${opp.reference_number} - no detail URL`);
        continue;
      }
      
      console.log(`\nFetching RFQ details for ${opp.reference_number}...`);
      
      try {
        const details = await rfqScraper.fetchRFQDetails(opp.detail_url);
        
        if (details && (details.rfq_number || details.procurement_mode || details.approved_budget)) {
          // Update opportunity with RFQ details
          const updateData = {
            ...opp,
            ...details,
            // Don't overwrite existing approved_budget if detail extraction failed
            approved_budget: details.approved_budget || opp.approved_budget
          };
          
          await Opportunity.update(opp.reference_number, updateData);
          enriched++;
          
          console.log(`✓ Enriched ${opp.reference_number} with RFQ details`);
          if (details.rfq_number) console.log(`  - RFQ Number: ${details.rfq_number}`);
          if (details.procurement_mode) console.log(`  - Procurement Mode: ${details.procurement_mode}`);
          if (details.approved_budget) console.log(`  - Budget: ${details.approved_budget}`);
        } else {
          console.log(`✗ No RFQ details found for ${opp.reference_number}`);
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`✗ Failed to fetch details for ${opp.reference_number}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('\n=============================');
    console.log(`Enrichment complete!`);
    console.log(`- Opportunities enriched: ${enriched}`);
    console.log(`- Failed: ${failed}`);
    
    // Close database connection
    if (typeof db.destroy === 'function') {
      await db.destroy();
    }
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n\nEnrichment interrupted.');
  if (typeof db.destroy === 'function') {
    await db.destroy();
  }
  process.exit(0);
});

enrichRFQDetails();