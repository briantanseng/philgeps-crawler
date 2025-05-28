#!/usr/bin/env node

import ITBDetailScraper from './scrapers/ITBDetailScraper.js';

async function testITBDetailExtraction() {
  const scraper = new ITBDetailScraper();
  
  // Test URL from the user's request
  const testUrl = 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?menuIndex=3&refID=11912520&Result=3';
  
  console.log('Testing ITB Detail Extraction');
  console.log('=============================');
  console.log(`URL: ${testUrl}\n`);
  
  try {
    const details = await scraper.extractITBDetails(testUrl);
    
    console.log('Extracted ITB Details:');
    console.log('---------------------');
    
    // Display all extracted fields
    Object.entries(details).forEach(([key, value]) => {
      console.log(`${key}: ${value || 'Not found'}`);
    });
    
    console.log('\nKey Fields:');
    console.log(`Area of Delivery: ${details.area_of_delivery || 'NOT FOUND'}`);
    console.log(`Solicitation Number: ${details.solicitation_number || 'NOT FOUND'}`);
    console.log(`Procurement Mode: ${details.procurement_mode || 'NOT FOUND'}`);
    console.log(`Category: ${details.category || 'NOT FOUND'}`);
    console.log(`Approved Budget: ${details.approved_budget || 'NOT FOUND'}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testITBDetailExtraction();