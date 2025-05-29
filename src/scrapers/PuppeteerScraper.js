import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import ITBDetailScraper from './ITBDetailScraper.js';

class PuppeteerScraper {
  constructor() {
    this.searchUrl = process.env.PHILGEPS_BASE_URL || 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3';
    this.requestDelay = parseInt(process.env.REQUEST_DELAY_MS) || 1000;
    this.fetchITBDetails = process.env.FETCH_ITB_DETAILS === 'true' || false;
    this.itbDetailScraper = new ITBDetailScraper();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async launchBrowser() {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    let browser;
    let browserLaunched = false;
    
    // Try to launch browser with retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Launching browser (attempt ${attempt}/3)...`);
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: executablePath || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-default-apps',
            '--window-size=1920,1080'
          ],
          defaultViewport: {
            width: 1920,
            height: 1080
          },
          ignoreHTTPSErrors: true,
          timeout: 60000
        });
        browserLaunched = true;
        break;
      } catch (launchError) {
        console.error(`Browser launch attempt ${attempt} failed:`, launchError.message);
        if (attempt < 3) {
          console.log('Retrying browser launch...');
          await this.delay(5000);
        }
      }
    }
    
    if (!browserLaunched) {
      throw new Error('Failed to launch browser after 3 attempts');
    }
    
    return browser;
  }

  async crawlPageRange(startPage = 1, endPage = null) {
    console.log(`Starting Puppeteer crawl from page ${startPage}...`);
    
    const browser = await this.launchBrowser();

    const opportunities = [];
    let currentPage = startPage;

    try {
      const page = await browser.newPage();
      
      // Set page timeout
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      // Add error handling for page crashes
      page.on('error', err => {
        console.error('Page crashed:', err);
      });
      
      // Suppress page errors from the PhilGEPS site's JavaScript
      page.on('pageerror', err => {
        // Only log non-PhilGEPS JavaScript errors
        if (!err.toString().includes('OpportunitiesSearchUI')) {
          console.error('Page error:', err);
        }
      });
      
      // Intercept and handle failed requests
      page.on('requestfailed', request => {
        console.warn('Request failed:', request.url(), request.failure().errorText);
      });
      
      console.log('Navigating to search page...');
      
      // Try multiple times to load the page
      let loaded = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(this.searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
          });
          
          // Wait a bit for JavaScript to execute
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          loaded = true;
          break;
        } catch (navError) {
          console.error(`Navigation attempt ${attempt} failed:`, navError.message);
          if (attempt < 3) {
            console.log('Retrying navigation...');
            await this.delay(5000);
          }
        }
      }
      
      if (!loaded) {
        throw new Error('Failed to load search page after 3 attempts');
      }

      // Get total number of opportunities and pages
      const totalInfo = await page.evaluate(() => {
        const infoText = document.body.innerText;
        const oppMatch = infoText.match(/(\d+[,\d]*)\s+opportunities found/);
        const totalOpps = oppMatch ? parseInt(oppMatch[1].replace(/,/g, '')) : 0;
        
        // Find total pages from pagination
        const pageLinks = Array.from(document.querySelectorAll('a')).filter(a => /^\d+$/.test(a.innerText.trim()));
        const pageNumbers = pageLinks.map(a => parseInt(a.innerText.trim()));
        const visiblePages = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
        
        // Count opportunities on current page
        const oppRows = document.querySelectorAll('a[href*="SplashBidNoticeAbstractUI.aspx"]').length;
        
        return { totalOpps, visiblePages, oppRows };
      });

      console.log(`Total opportunities: ${totalInfo.totalOpps}`);
      console.log(`Visible page numbers: ${totalInfo.visiblePages}`);
      console.log(`Opportunities on first page: ${totalInfo.oppRows}`);
      
      // Calculate actual total pages based on opportunities
      let estimatedTotalPages = totalInfo.visiblePages;
      if (totalInfo.totalOpps > 0 && totalInfo.oppRows > 0) {
        estimatedTotalPages = Math.ceil(totalInfo.totalOpps / totalInfo.oppRows);
        console.log(`Estimated total pages based on opportunities: ${estimatedTotalPages}`);
      }
      
      // Use the higher of visible pages or estimated pages
      const totalPages = Math.max(totalInfo.visiblePages, estimatedTotalPages);
      console.log(`Using total pages: ${totalPages}`);
      
      // Determine the actual end page
      const actualEndPage = endPage ? Math.min(endPage, totalPages) : totalPages;
      
      // Validate page range
      if (startPage > totalPages) {
        console.log(`Start page ${startPage} exceeds total pages ${totalPages}`);
        return opportunities;
      }
      
      console.log(`Will crawl pages ${startPage} to ${actualEndPage} (out of ${totalPages} total pages)`);

      // Navigate to start page if not page 1
      if (startPage > 1) {
        console.log(`Navigating to start page ${startPage}...`);
        const navigated = await this.navigateToPage(page, startPage);
        if (!navigated) {
          console.log(`Failed to navigate to page ${startPage}`);
          return opportunities;
        }
        await this.delay(this.requestDelay);
      }

      // Crawl the page range
      while (currentPage <= actualEndPage) {
        console.log(`\nExtracting opportunities from page ${currentPage}...`);
        
        // Get page HTML and extract opportunities
        const html = await page.content();
        const $ = cheerio.load(html);
        const pageOpportunities = this.extractOpportunitiesFromPage($);
        
        console.log(`Found ${pageOpportunities.length} opportunities on page ${currentPage}`);
        opportunities.push(...pageOpportunities);

        // Go to next page if not the last
        if (currentPage < actualEndPage) {
          const nextPageExists = await this.goToNextPage(page, currentPage + 1);
          if (!nextPageExists) {
            console.log('No more pages available');
            break;
          }
          await this.delay(this.requestDelay);
        }
        
        currentPage++;
      }
      
      console.log(`\nCrawling complete. Total opportunities extracted: ${opportunities.length}`);
      console.log(`Pages crawled: ${startPage} to ${currentPage - 1}`);
      
      await browser.close();
      
      // Fetch ITB details if enabled
      if (this.fetchITBDetails && opportunities.length > 0) {
        console.log('\nFetching ITB details for opportunities...');
        
        for (let i = 0; i < opportunities.length; i++) {
          const opportunity = opportunities[i];
          if (opportunity.detail_url) {
            try {
              console.log(`Fetching ITB details ${i + 1}/${opportunities.length}: ${opportunity.reference_number}`);
              const itbDetails = await this.itbDetailScraper.extractITBDetails(opportunity.detail_url);
              
              // Merge ITB details with the opportunity
              Object.assign(opportunity, itbDetails);
              
              console.log(`  - Area of Delivery: ${itbDetails.itb_area_of_delivery || 'Not specified'}`);
              
              // Add delay between requests to avoid overloading the server
              if (i < opportunities.length - 1) {
                await this.delay(this.requestDelay);
              }
            } catch (error) {
              console.error(`  - Error fetching ITB details for ${opportunity.reference_number}:`, error.message);
            }
          }
        }
        console.log('ITB details extraction complete');
      }
      
    } catch (error) {
      console.error('Crawling error:', error);
      if (browser) await browser.close();
    }

    return opportunities;
  }

  // Crawl a single page
  async crawlPage(pageNumber) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const opportunities = [];
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      console.log(`Opening search page...`);
      await page.goto(this.searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Navigate to the specific page if not page 1
      if (pageNumber > 1) {
        console.log(`Navigating to page ${pageNumber}...`);
        const navigated = await this.navigateToPage(page, pageNumber);
        if (!navigated) {
          console.log(`Failed to navigate to page ${pageNumber}`);
          return opportunities;
        }
        await this.delay(this.requestDelay);
      }
      
      // Extract opportunities from the current page
      const html = await page.content();
      const $ = cheerio.load(html);
      const pageOpportunities = this.extractOpportunitiesFromPage($);
      
      opportunities.push(...pageOpportunities);
      
    } catch (error) {
      console.error(`Error crawling page ${pageNumber}:`, error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
    
    return opportunities;
  }
  
  // Backward compatibility
  async crawlAllPages(maxPages = 100) {
    return this.crawlPageRange(1, maxPages);
  }

  async navigateToPage(page, targetPageNumber) {
    try {
      console.log(`Navigating to page ${targetPageNumber} using Next button clicks...`);
      
      // PhilGEPS requires sequential navigation using Next button
      let currentPage = 1;
      
      while (currentPage < targetPageNumber) {
        const nextClicked = await this.goToNextPage(page, currentPage + 1);
        if (!nextClicked) {
          console.log(`Failed to navigate from page ${currentPage} to ${currentPage + 1}`);
          return false;
        }
        
        currentPage++;
        
        // Add delay between navigations to avoid rate limiting
        if (currentPage < targetPageNumber) {
          await this.delay(1000);
        }
      }
      
      console.log(`Successfully navigated to page ${targetPageNumber}`);
      return true;

    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }

  async goToNextPage(page, pageNumber) {
    try {
      // For PhilGEPS, we need to handle the ASP.NET postback properly
      const navigationResult = await page.evaluate(() => {
        try {
          // Look for the Next link - PhilGEPS uses <Next>
          const nextLink = Array.from(document.querySelectorAll('a')).find(a => {
            const text = a.innerText.trim();
            return text === '<Next>' || text === 'Next>' || text === 'Next' || 
                   text === '>' || text === '>>';
          });
          
          if (!nextLink) {
            return { success: false, reason: 'No Next button found' };
          }
          
          // Check if it's not disabled
          const href = nextLink.getAttribute('href');
          if (!href || href.includes('javascript:void') || nextLink.disabled) {
            return { success: false, reason: 'Next button is disabled' };
          }
          
          // Get the onclick handler and extract the postback parameters
          const onclickStr = nextLink.getAttribute('onclick');
          if (onclickStr && onclickStr.includes('__doPostBack')) {
            // Extract postback parameters using regex
            const match = onclickStr.match(/__doPostBack\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
            if (match && typeof __doPostBack === 'function') {
              // Call __doPostBack directly with the extracted parameters
              __doPostBack(match[1], match[2]);
              return { success: true, method: 'postback' };
            }
          }
          
          // Try to fix the context before clicking
          if (onclickStr && onclickStr.includes('this.document.OpportunitiesSearchUI')) {
            // Create the expected form reference if it doesn't exist
            if (!window.document.OpportunitiesSearchUI && window.document.forms[0]) {
              window.document.OpportunitiesSearchUI = window.document.forms[0];
            }
          }
          
          // Use dispatchEvent instead of click to avoid context issues
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          nextLink.dispatchEvent(clickEvent);
          return { success: true, method: 'dispatch' };
          
        } catch (error) {
          return { success: false, reason: error.message };
        }
      });

      if (!navigationResult.success) {
        console.log(`Navigation failed: ${navigationResult.reason}`);
        return false;
      }

      // Wait for navigation or page update
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle2', 
          timeout: 10000 
        });
      } catch (navError) {
        // Navigation might not trigger a full page reload, just content update
        // This is expected for ASP.NET postback
      }
      
      // Wait for the page content to stabilize
      await page.waitForFunction(
        () => {
          // Check if the page has opportunities
          const opportunities = document.querySelectorAll('a[href*="SplashBidNoticeAbstractUI.aspx"]');
          return opportunities.length > 0;
        },
        { timeout: 10000 }
      );
      
      // Give it a bit more time for full render
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;

    } catch (error) {
      console.error('Error navigating to next page:', error.message);
      return false;
    }
  }

  extractOpportunitiesFromPage($) {
    const opportunities = [];
    
    // Look for the main opportunities table
    const $table = $('table').filter((i, el) => {
      const text = $(el).text();
      return text.includes('Publish Date') || text.includes('Closing Date') || $(el).find('a[href*="SplashBidNoticeAbstractUI.aspx"]').length > 0;
    }).first();
    
    if ($table.length > 0) {
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
        
        // Extract data from cells
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
          detail_url: href.startsWith('http') ? href : `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/${href}`,
          // RFQ details - to be populated from detail page if needed
          rfq_solicitation_number: null,
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
    }
    
    return opportunities;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      dateStr = dateStr.trim();
      
      // Handle DD/MM/YYYY format with optional time
      const dateTimeMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s+([AP]M))?/);
      if (dateTimeMatch) {
        const [_, day, month, year, hour, minute, ampm] = dateTimeMatch;
        let hours = hour ? parseInt(hour) : 0;
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          hours,
          minute ? parseInt(minute) : 0
        );
        
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      return null;
    }
  }
}

export default PuppeteerScraper;