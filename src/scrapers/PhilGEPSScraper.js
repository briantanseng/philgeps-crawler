import * as cheerio from 'cheerio';
import { URL } from 'url';
import httpClient from '../utils/httpClient.js';

class PhilGEPSScraper {
  constructor() {
    this.baseUrl = 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/';
    this.searchUrl = process.env.PHILGEPS_BASE_URL || 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3';
    this.requestDelay = parseInt(process.env.REQUEST_DELAY_MS) || 1000;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPage(url) {
    try {
      // Add delay before request to avoid rate limiting
      await this.delay(this.requestDelay);
      
      const response = await httpClient.get(url, {
        // Override retry for this specific request if needed
        retry: 3,
        timeout: 60000
      });
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      const errorMsg = error.code === 'ECONNRESET' ? 'Connection reset by server' :
                      error.code === 'ETIMEDOUT' ? 'Request timeout' :
                      error.code === 'ENOTFOUND' ? 'DNS lookup failed' :
                      error.code === 'ECONNABORTED' ? 'Request aborted' :
                      error.response ? `HTTP ${error.response.status}` :
                      error.message;
      
      console.error(`Failed to fetch ${url}: ${errorMsg}`);
      throw new Error(`Failed to fetch page: ${errorMsg}`);
    }
  }

  async getOpportunitiesFromSearchPage(startPage = 1, endPage = null) {
    const opportunities = [];
    
    // Note: PhilGEPS uses ASP.NET postback mechanism for pagination
    // Without maintaining ViewState and session, we can only get the first page
    // For a production system, you'd need to use a headless browser or
    // reverse-engineer the postback mechanism
    
    console.log(`Note: Due to ASP.NET postback requirements, currently only extracting from the first page.`);
    console.log(`To crawl specific page ranges, use the Puppeteer-based crawler with 'npm run crawl:all'.`);
    
    try {
      console.log(`Fetching search results page 1...`);
      
      const html = await this.fetchPage(this.searchUrl);
      const $ = cheerio.load(html);
      
      // Extract opportunities from the search results
      const pageOpportunities = this.extractOpportunitiesFromSearchResults($);
      
      if (pageOpportunities.length === 0) {
        console.log('No opportunities found');
      } else {
        opportunities.push(...pageOpportunities);
        
        // Get total pages info
        const totalPages = this.getTotalPages($);
        const totalOppsText = $('span:contains("opportunities found")').text();
        const totalMatch = totalOppsText.match(/(\d+[,\d]*)\s+opportunities/);
        const totalOpps = totalMatch ? totalMatch[1].replace(/,/g, '') : 'unknown';
        
        console.log(`Total opportunities available: ${totalOpps}`);
        console.log(`Total pages: ${totalPages}`);
        console.log(`Extracted ${pageOpportunities.length} opportunities from page 1`);
        
        if (startPage > 1 || endPage > 1) {
          console.log(`\nNote: Pages ${startPage}-${endPage || 'end'} requested, but only page 1 available with basic scraper.`);
          console.log(`Use 'npm run crawl:all ${startPage} ${endPage}' for full page range support.`);
        }
      }
      
    } catch (error) {
      console.error(`Error fetching page:`, error.message);
    }
    
    return opportunities;
  }

  async getOpportunitiesByCategory(categoryUrl, maxPages = 5) {
    const opportunities = [];
    let currentPage = 1;
    
    while (currentPage <= maxPages) {
      try {
        console.log(`Fetching page ${currentPage} of ${categoryUrl}`);
        const html = await this.fetchPage(categoryUrl);
        const $ = cheerio.load(html);
        
        // Extract opportunities from the current page
        const pageOpportunities = this.extractOpportunitiesFromPage($, categoryUrl);
        opportunities.push(...pageOpportunities);
        
        // Check for next page
        const hasNextPage = this.hasNextPage($, currentPage);
        if (!hasNextPage) break;
        
        // Prepare URL for next page (this might need adjustment based on actual pagination)
        currentPage++;
        await this.delay(this.requestDelay);
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error.message);
        break;
      }
    }
    
    return opportunities;
  }

  extractOpportunitiesFromSearchResults($) {
    const opportunities = [];
    
    // Debug: log what we're working with
    console.log('Extracting opportunities from page...');
    
    // First, let's try to understand the page structure better
    // Check if there's a table with opportunities
    const $table = $('table').filter((i, el) => {
      const text = $(el).text();
      return text.includes('Publish Date') || text.includes('Closing Date') || $(el).find('a[href*="SplashBidNoticeAbstractUI.aspx"]').length > 0;
    }).first();
    
    if ($table.length > 0) {
      console.log('Found opportunities table, extracting from table rows...');
      $table.find('tr').each((index, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        // Skip header rows
        if (cells.length < 3 || $row.find('th').length > 0) return;
        
        // Look for the link in the row
        const $link = $row.find('a[href*="SplashBidNoticeAbstractUI.aspx"]');
        if ($link.length === 0) return;
        
        const titleText = $link.text().trim();
        const href = $link.attr('href');
        
        if (!titleText || !href) return;
        
        // Extract reference ID from URL
        const refIdMatch = href.match(/refID=(\d+)/i);
        const referenceNumber = refIdMatch ? refIdMatch[1] : `REF-${Date.now()}-${index}`;
        
        // Extract data from cells - typical structure:
        // Cell 0: Publish Date
        // Cell 1: Closing Date  
        // Cell 2: Title (with link)
        let publishDate = null;
        let closingDate = null;
        let category = 'General';
        let entity = 'Not specified';
        
        if (cells.length >= 3) {
          const publishText = cells.eq(0).text().trim();
          const closingText = cells.eq(1).text().trim();
          
          publishDate = this.parseDate(publishText);
          closingDate = this.parseDate(closingText);
          
          // Extract category and entity from the title cell
          const titleCellText = cells.eq(2).text();
          const afterTitle = titleCellText.substring(titleCellText.indexOf(titleText) + titleText.length);
          const parts = afterTitle.split(',').map(s => s.trim()).filter(s => s.length > 0);
          
          if (parts.length > 0) category = parts[0] || 'General';
          if (parts.length > 1) entity = parts[1] || 'Not specified';
        }
        
        const opportunity = {
          reference_number: referenceNumber,
          title: titleText,
          procuring_entity: entity,
          category: category,
          approved_budget: null,
          currency: 'PHP',
          publish_date: publishDate,
          closing_date: closingDate,
          status: 'Open',
          source_url: this.searchUrl,
          detail_url: new URL(href, this.baseUrl).href,
          // RFQ details - to be populated from detail page if needed
          rfq_number: null,
          delivery_period: null,
          payment_terms: null,
          procurement_mode: null,
          funding_source: null,
          area_of_delivery: null,
          pre_bid_conference: null,
          bid_submission_deadline: closingDate,
          bid_opening_date: null,
          technical_specifications: null,
          eligibility_criteria: null,
          additional_requirements: null
        };
        
        opportunities.push(opportunity);
      });
    } else {
      console.log('No table found, falling back to link-based extraction...');
      // Fallback to the original method
      $('a[href*="SplashBidNoticeAbstractUI.aspx"]').each((index, element) => {
      const $link = $(element);
      const titleText = $link.text().trim();
      const href = $link.attr('href');
      
      if (!titleText || !href) return;
      
      // Extract reference ID from URL
      const refIdMatch = href.match(/refID=(\d+)/i);
      const referenceNumber = refIdMatch ? refIdMatch[1] : `REF-${Date.now()}-${index}`;
      
      // Get the parent container to find other details
      const $container = $link.closest('div, td, li, p') || $link.parent();
      
      // Get all text from the page to find associated dates
      // PhilGEPS lists opportunities with dates in separate elements
      const pageText = $.html();
      const opportunitySection = pageText.substring(
        Math.max(0, pageText.indexOf(href) - 500),
        Math.min(pageText.length, pageText.indexOf(href) + 500)
      );
      
      // Try to extract dates from the surrounding text
      // Looking for patterns like "26/05/2025" and "30/10/2026 02:00 PM"
      const allDates = opportunitySection.match(/\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}\s+[AP]M)?/g) || [];
      
      let publishDate = null;
      let closingDate = null;
      
      if (allDates.length >= 2) {
        publishDate = this.parseDate(allDates[0]);
        closingDate = this.parseDate(allDates[1]);
      } else if (allDates.length === 1) {
        // If only one date found, assume it's the closing date
        closingDate = this.parseDate(allDates[0]);
      }
      
      // Extract category and entity from text after the title
      // The format seems to be: title , category , entity
      const containerText = $container.text();
      const afterTitle = containerText.substring(containerText.indexOf(titleText) + titleText.length);
      const parts = afterTitle.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      // Filter out any parts that look like dates
      const nonDateParts = parts.filter(part => !part.match(/\d{1,2}\/\d{1,2}\/\d{4}/));
      
      const category = nonDateParts[0] || 'General';
      const entity = nonDateParts[1] || 'Not specified';
      
      const opportunity = {
        reference_number: referenceNumber,
        title: titleText,
        procuring_entity: entity,
        category: category,
        approved_budget: null,
        currency: 'PHP',
        publish_date: publishDate,
        closing_date: closingDate,
        status: 'Open',
        source_url: this.searchUrl,
        detail_url: new URL(href, this.baseUrl).href
      };
      
        opportunities.push(opportunity);
      });
    }
    
    console.log(`Found ${opportunities.length} opportunities on this page`);
    return opportunities;
  }

  isValidDate(dateStr) {
    if (!dateStr) return false;
    // Check for common date patterns
    return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(dateStr) || 
           /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(dateStr) ||
           /\w+\s+\d{1,2},?\s+\d{4}/.test(dateStr);
  }

  getTotalPages($) {
    // Look for pagination info
    const paginationText = $('span:contains("of")').text();
    const pageMatch = paginationText.match(/of\s+(\d+)/i);
    if (pageMatch) {
      return parseInt(pageMatch[1]);
    }
    
    // Alternative: count page number links
    const pageLinks = $('a').filter((i, el) => /^\d+$/.test($(el).text().trim()));
    if (pageLinks.length > 0) {
      const pageNumbers = pageLinks.map((i, el) => parseInt($(el).text().trim())).get();
      return Math.max(...pageNumbers);
    }
    
    return 1; // Default to 1 page if we can't determine
  }

  async getOpportunityDetails(detailUrl) {
    try {
      const html = await this.fetchPage(detailUrl);
      const $ = cheerio.load(html);
      
      const details = {
        description: '',
        contact_person: '',
        contact_details: '',
        bid_documents: ''
      };
      
      // Extract additional details (selectors need to be adjusted based on actual page structure)
      $('table tr').each((index, row) => {
        const $row = $(row);
        const label = $row.find('td:first-child').text().trim().toLowerCase();
        const value = $row.find('td:last-child').text().trim();
        
        if (label.includes('description')) {
          details.description = value;
        } else if (label.includes('contact')) {
          if (label.includes('person')) {
            details.contact_person = value;
          } else {
            details.contact_details = value;
          }
        } else if (label.includes('document')) {
          details.bid_documents = value;
        }
      });
      
      return details;
    } catch (error) {
      console.error(`Error fetching details from ${detailUrl}:`, error.message);
      return null;
    }
  }

  parseAmount(amountStr) {
    if (!amountStr) return null;
    const cleanedAmount = amountStr.replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleanedAmount);
    return isNaN(amount) ? null : amount;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      // Remove any extra whitespace
      dateStr = dateStr.trim();
      
      // Handle DD/MM/YYYY format with optional time
      const dateTimeMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s+([AP]M))?/);
      if (dateTimeMatch) {
        const [_, day, month, year, hour, minute, ampm] = dateTimeMatch;
        let hours = hour ? parseInt(hour) : 0;
        
        // Convert to 24-hour format if PM
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1, // JavaScript months are 0-indexed
          parseInt(day),
          hours,
          minute ? parseInt(minute) : 0
        );
        
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      
      // Try standard Date parsing for other formats
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      console.error('Date parsing error:', error, 'for date string:', dateStr);
      return null;
    }
  }

  hasNextPage($, currentPage) {
    // Check for next page link or button
    const nextPageLink = $('a').filter((i, el) => {
      const text = $(el).text().trim();
      return text === 'Next' || text === '>' || text === (currentPage + 1).toString();
    });
    
    return nextPageLink.length > 0;
  }
}

export default PhilGEPSScraper;