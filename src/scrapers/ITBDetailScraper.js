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
      
      // Additional wait to ensure dynamic content is loaded
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to find and log the page structure for debugging
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
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
              // Parse contact information which may be concatenated
              const contactLines = value.split(/(?=[A-Z][a-z]+\s+[A-Z])|(?=\d{2,})|(?=\w+@\w+\.\w+)/);
              if (contactLines.length > 0) {
                details.contact_person = contactLines[0].trim();
                // Try to extract other contact details from the concatenated string
                contactLines.forEach(line => {
                  if (line.match(/^\d{2,}/)) {
                    details.contact_phone = line.trim();
                  } else if (line.match(/\w+@\w+\.\w+/)) {
                    details.contact_email = line.trim();
                  } else if (line.match(/Secretary|Chairman|Officer|Manager/i)) {
                    details.contact_designation = line.trim();
                  } else if (line.match(/City|Province|Barangay|Street/i) && !details.contact_address) {
                    details.contact_address = line.trim();
                  }
                });
              } else {
                details.contact_person = value;
              }
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
            case 'closing date/time':
            case 'closing date':
              details.closing_date = value;
              details.bid_submission_deadline = value;
              break;
            case 'last updated / time':
            case 'last updated/time':
              details.last_updated = value;
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
    
    // Extract description - Try multiple strategies
    let description = '';
    
    // Strategy 1: Look for span with Description in ID
    const descriptionElement = $('span[id*="Description"]').first();
    if (descriptionElement.length) {
      description = descriptionElement.text().trim();
    }
    
    // Strategy 2: Look for the main content area (usually in a td with colspan)
    if (!description) {
      // Find table cells with colspan that contain the main text
      $('td[colspan]').each((i, td) => {
        const $td = $(td);
        const text = $td.text().trim();
        
        // Look for long text blocks that contain invitation text
        if (text.length > 500 && (
          text.includes('INVITATION TO BID') ||
          text.includes('invites bids') ||
          text.includes('intends to apply') ||
          text.includes('Bidding will be conducted') ||
          text.includes('Interested bidders')
        )) {
          description = text;
          return false; // break the loop
        }
      });
    }
    
    // Strategy 2b: Look for nested table structure common in PhilGEPS
    if (!description) {
      // PhilGEPS often uses nested tables, look for inner tables with content
      $('table table').each((i, innerTable) => {
        const $table = $(innerTable);
        const tableText = $table.text().trim();
        
        if (tableText.length > 500 && (
          tableText.includes('INVITATION TO BID') ||
          tableText.includes('invites bids') ||
          tableText.includes('intends to apply')
        )) {
          // Extract just the content cells, not the structure
          const contentCells = [];
          $table.find('td').each((j, td) => {
            const cellText = $(td).text().trim();
            if (cellText.length > 100 && !cellText.match(/^(Reference Number|Solicitation|Category|Area)/)) {
              contentCells.push(cellText);
            }
          });
          
          if (contentCells.length > 0) {
            description = contentCells.join('\n\n');
            return false;
          }
        }
      });
    }
    
    // Strategy 3: Look for specific content patterns in any table cell
    if (!description) {
      $('td').each((i, td) => {
        const $td = $(td);
        const text = $td.text().trim();
        
        // Check if this looks like the main description
        if (text.length > 300 && (
          text.startsWith('INVITATION TO BID') ||
          text.includes('now invites bids for') ||
          text.includes('intends to apply the sum')
        )) {
          // Check if this is not a label cell (usually short)
          const prevTd = $td.prev('td');
          if (!prevTd.length || prevTd.text().trim().length > 50) {
            description = text;
            return false; // break the loop
          }
        }
      });
    }
    
    // Strategy 4: Look for div or span with specific classes that might contain description
    if (!description) {
      const possibleSelectors = [
        '.description',
        '.tender-description',
        '.bid-description',
        '#divDescription',
        'div[id*="Description"]',
        'span.content'
      ];
      
      for (const selector of possibleSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim().length > 100) {
          description = element.text().trim();
          break;
        }
      }
    }
    
    // Strategy 5: Look for the main content based on page structure
    if (!description) {
      // Sometimes the description is in a specific table row after the details
      let foundDetailsSection = false;
      $('tr').each((i, tr) => {
        const $tr = $(tr);
        const text = $tr.text().trim();
        
        // Skip rows that are clearly part of the details section
        if (text.includes('Reference Number:') || text.includes('Solicitation Number:')) {
          foundDetailsSection = true;
          return true; // continue
        }
        
        // After details section, look for content rows
        if (foundDetailsSection && text.length > 300) {
          // Check if this row contains the main description
          const $td = $tr.find('td').first();
          if ($td.length && $td.attr('colspan')) {
            description = $td.text().trim();
            return false; // break
          }
        }
      });
    }
    
    // Strategy 6: Use page evaluation to get text content
    if (!description) {
      // As a last resort, get all text content and look for the description pattern
      const allText = $('body').text();
      const startPattern = /INVITATION TO BID[^\n]*\n/;
      const match = allText.match(startPattern);
      
      if (match) {
        const startIndex = match.index;
        // Extract text from the start of invitation to a reasonable length
        const extractedText = allText.substring(startIndex, startIndex + 5000);
        
        // Find where the description likely ends (before footer content)
        const endPatterns = [
          /\n\s*\n\s*\n/, // Multiple newlines
          /For further information/, // Common ending phrase
          /\(SGD\)/, // Signature marker
          /©\s*\d{4}/, // Copyright notice
        ];
        
        let endIndex = extractedText.length;
        for (const pattern of endPatterns) {
          const endMatch = extractedText.match(pattern);
          if (endMatch && endMatch.index < endIndex) {
            endIndex = endMatch.index;
          }
        }
        
        description = extractedText.substring(0, endIndex).trim();
      }
    }
    
    if (description) {
      // Clean up the description text
      details.description = description
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
        .replace(/\t+/g, ' ') // Replace tabs with spaces
        .trim();
    }
    
    // Also try to extract eligibility requirements if present
    const eligibilityPatterns = [
      /eligibility requirements?:?\s*(.*?)(?=\n\n|$)/is,
      /eligible bidders?:?\s*(.*?)(?=\n\n|$)/is,
      /bidders? should have completed(.*?)(?=\n\n|$)/is
    ];
    
    for (const pattern of eligibilityPatterns) {
      const match = (details.description || '').match(pattern);
      if (match) {
        details.eligibility_requirements = match[1].trim();
        break;
      }
    }
    
    // Map the extracted fields to ITB-prefixed database columns
    const itbDetails = {
      itb_solicitation_number: details.solicitation_number || null,
      itb_trade_agreement: details.trade_agreement || null,
      itb_procurement_mode: details.procurement_mode || null,
      itb_classification: details.classification || null,
      itb_category: details.category || null,
      itb_approved_budget: details.approved_budget || null,
      itb_delivery_period: details.delivery_period || null,
      itb_client_agency: details.client_agency || null,
      itb_contact_person: details.contact_person || null,
      itb_contact_designation: details.contact_designation || null,
      itb_contact_address: details.contact_address || null,
      itb_contact_phone: details.contact_phone || null,
      itb_contact_email: details.contact_email || null,
      itb_area_of_delivery: details.area_of_delivery || null,
      itb_date_posted: details.date_published || null,
      itb_date_last_updated: details.last_updated || null,
      itb_closing_date: details.closing_date || null,
      itb_opening_date: details.bid_opening_date || null,
      itb_pre_bid_conference: details.pre_bid_conference || null,
      itb_description: details.description || null,
      itb_eligibility: details.eligibility_requirements || null,
      itb_created_by: details.created_by || null,
      itb_status: 'Active',
      itb_bid_supplements: details.bid_supplements || null,
      itb_document_request_list: details.document_request_list || null,
      itb_bidding_documents: details.bid_documents_fee || null
    };
    
    return itbDetails;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ITBDetailScraper;