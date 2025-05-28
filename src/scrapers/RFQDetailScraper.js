import axios from 'axios';
import * as cheerio from 'cheerio';
import httpClient from '../utils/httpClient.js';

class RFQDetailScraper {
  constructor() {
    this.baseUrl = 'https://notices.philgeps.gov.ph';
  }

  async fetchRFQDetails(detailUrl) {
    try {
      console.log(`Fetching RFQ details from: ${detailUrl}`);
      
      const response = await httpClient.get(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const $ = cheerio.load(response.data);
      const rfqDetails = this.extractRFQDetails($);
      
      return rfqDetails;
    } catch (error) {
      console.error(`Error fetching RFQ details from ${detailUrl}:`, error.message);
      return null;
    }
  }

  extractRFQDetails($) {
    const details = {
      rfq_number: null,
      delivery_period: null,
      payment_terms: null,
      procurement_mode: null,
      funding_source: null,
      area_of_delivery: null,
      pre_bid_conference: null,
      bid_submission_deadline: null,
      bid_opening_date: null,
      technical_specifications: null,
      eligibility_criteria: null,
      additional_requirements: null,
      approved_budget: null
    };

    // Common patterns for extracting data from PhilGEPS detail pages
    // These may need adjustment based on actual page structure
    
    // Look for labeled fields
    $('td, div, span').each((i, elem) => {
      const text = $(elem).text().trim();
      const nextText = $(elem).next().text().trim();
      
      // RFQ Number
      if (text.includes('RFQ Number') || text.includes('Reference Number')) {
        details.rfq_number = nextText || this.extractNextValue($, elem);
      }
      
      // Procurement Mode
      if (text.includes('Procurement Mode') || text.includes('Mode of Procurement')) {
        details.procurement_mode = nextText || this.extractNextValue($, elem);
      }
      
      // Funding Source
      if (text.includes('Funding Source') || text.includes('Source of Fund')) {
        details.funding_source = nextText || this.extractNextValue($, elem);
      }
      
      // Delivery Period
      if (text.includes('Delivery Period') || text.includes('Delivery Time')) {
        details.delivery_period = nextText || this.extractNextValue($, elem);
      }
      
      // Payment Terms
      if (text.includes('Payment Terms') || text.includes('Terms of Payment')) {
        details.payment_terms = nextText || this.extractNextValue($, elem);
      }
      
      // Area of Delivery
      if (text.includes('Area of Delivery') || text.includes('Place of Delivery')) {
        details.area_of_delivery = nextText || this.extractNextValue($, elem);
      }
      
      // Pre-bid Conference
      if (text.includes('Pre-bid Conference') || text.includes('Pre-Bid Conference')) {
        details.pre_bid_conference = nextText || this.extractNextValue($, elem);
      }
      
      // Bid Submission
      if (text.includes('Bid Submission') || text.includes('Submission Deadline')) {
        details.bid_submission_deadline = this.parseDate(nextText || this.extractNextValue($, elem));
      }
      
      // Bid Opening
      if (text.includes('Bid Opening') || text.includes('Opening Date')) {
        details.bid_opening_date = this.parseDate(nextText || this.extractNextValue($, elem));
      }
      
      // Approved Budget
      if (text.includes('Approved Budget') || text.includes('ABC')) {
        const budgetText = nextText || this.extractNextValue($, elem);
        details.approved_budget = this.parseBudget(budgetText);
      }
    });

    // Look for specifications in larger text blocks
    $('div, td').each((i, elem) => {
      const text = $(elem).text();
      
      if (text.includes('Technical Specification') || text.includes('Specifications')) {
        details.technical_specifications = text.substring(0, 1000); // Limit length
      }
      
      if (text.includes('Eligibility') || text.includes('Requirements')) {
        details.eligibility_criteria = text.substring(0, 1000); // Limit length
      }
    });

    return details;
  }

  extractNextValue($, elem) {
    // Try different methods to get the value after a label
    const $elem = $(elem);
    
    // Check next sibling
    const nextSibling = $elem.next();
    if (nextSibling.length > 0) {
      return nextSibling.text().trim();
    }
    
    // Check parent's next sibling
    const parentNext = $elem.parent().next();
    if (parentNext.length > 0) {
      return parentNext.text().trim();
    }
    
    // Check if it's in a table structure
    if ($elem.prop('tagName') === 'TD') {
      const nextTd = $elem.next('td');
      if (nextTd.length > 0) {
        return nextTd.text().trim();
      }
    }
    
    return null;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Handle various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr);
    }
    
    return dateStr; // Return original if parsing fails
  }

  parseBudget(budgetStr) {
    if (!budgetStr) return null;
    
    // Remove currency symbols and commas
    const cleanStr = budgetStr.replace(/[₱$,]/g, '').trim();
    const amount = parseFloat(cleanStr);
    
    return isNaN(amount) ? null : amount;
  }
}

export default RFQDetailScraper;