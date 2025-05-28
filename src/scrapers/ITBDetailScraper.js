import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

class ITBDetailScraper {
  constructor() {
    this.requestDelay = 2000; // 2 seconds between requests
  }

  async extractITBDetails(detailUrl) {
    let browser;
    
    try {
      console.log(`Extracting ITB details from: ${detailUrl}`);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the detail page
      await page.goto(detailUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for the main content to load
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Extract the HTML content
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Extract ITB details
      const details = this.parseITBPage($);
      
      await browser.close();
      
      return details;
      
    } catch (error) {
      console.error('Error extracting ITB details:', error);
      if (browser) await browser.close();
      throw error;
    }
  }

  parseITBPage($) {
    const details = {};
    
    // Find all tables and extract key-value pairs
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          // Get label and value
          const label = cells.eq(0).text().trim().replace(/[:]/g, '');
          const value = cells.eq(1).text().trim();
          
          // Map specific fields
          switch (label.toLowerCase()) {
            case 'area of delivery':
            case 'area(s) of delivery':
              details.area_of_delivery = value;
              break;
            case 'solicitation number':
            case 'solicitation no.':
              details.solicitation_number = value;
              break;
            case 'trade agreement':
              details.trade_agreement = value;
              break;
            case 'procurement mode':
              details.procurement_mode = value;
              break;
            case 'classification':
              details.classification = value;
              break;
            case 'category':
              details.category = value;
              break;
            case 'approved budget for the contract':
            case 'approved budget':
              // Parse budget amount
              const budgetMatch = value.match(/PHP\s*([\d,]+\.?\d*)/);
              if (budgetMatch) {
                details.approved_budget = parseFloat(budgetMatch[1].replace(/,/g, ''));
              }
              break;
            case 'delivery period':
              details.delivery_period = value;
              break;
            case 'client agency':
              details.client_agency = value;
              break;
            case 'contact person':
              details.contact_person = value;
              break;
            case 'designation':
              details.contact_designation = value;
              break;
            case 'address':
              details.contact_address = value;
              break;
            case 'telephone no.':
            case 'telephone':
              details.contact_phone = value;
              break;
            case 'e-mail address':
            case 'email':
              details.contact_email = value;
              break;
            case 'bid supplements':
              details.bid_supplements = parseInt(value) || 0;
              break;
            case 'document request list':
              details.document_request_list = parseInt(value) || 0;
              break;
            case 'date published':
              details.date_published = value;
              break;
            case 'last updated':
              details.last_updated = value;
              break;
            case 'closing date / time':
            case 'closing date':
              details.bid_submission_deadline = value;
              break;
            case 'opening date / time':
            case 'opening date':
              details.bid_opening_date = value;
              break;
            case 'pre-bid conference':
              details.pre_bid_conference = value;
              break;
            case 'bid documents':
              details.bid_documents_fee = value;
              break;
            case 'created by':
              details.created_by = value;
              break;
            case 'bac chairman':
              details.bac_chairman = value;
              break;
            case 'bac secretariat':
              details.bac_secretariat = value;
              break;
          }
        }
      });
    });
    
    // Extract description from the page if available
    const descriptionElement = $('span[id*="Description"]').first();
    if (descriptionElement.length) {
      details.description = descriptionElement.text().trim();
    }
    
    return details;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ITBDetailScraper;