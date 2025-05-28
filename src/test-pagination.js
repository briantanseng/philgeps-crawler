#!/usr/bin/env node

import 'dotenv/config';
import puppeteer from 'puppeteer';

async function testPagination() {
  console.log('Testing PhilGEPS Pagination Structure');
  console.log('=====================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    
    console.log('Navigating to PhilGEPS search page...');
    await page.goto('https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Page loaded. Analyzing pagination...\n');

    // Extract all pagination information
    const paginationInfo = await page.evaluate(() => {
      const info = {
        totalOpportunities: '',
        currentPage: '',
        pageLinks: [],
        navigationLinks: [],
        paginationHTML: '',
        formElements: []
      };

      // Get total opportunities
      const infoText = document.body.innerText;
      const oppMatch = infoText.match(/(\d+[,\d]*)\s+opportunities found/);
      info.totalOpportunities = oppMatch ? oppMatch[1] : 'Not found';

      // Find all links that might be pagination
      const allLinks = Array.from(document.querySelectorAll('a'));
      
      // Page number links
      info.pageLinks = allLinks
        .filter(a => /^\d+$/.test(a.innerText.trim()))
        .map(a => ({
          text: a.innerText.trim(),
          href: a.href,
          onclick: a.onclick ? a.onclick.toString() : null,
          style: a.getAttribute('style'),
          classes: a.className
        }));

      // Navigation links (Next, Previous, etc.)
      info.navigationLinks = allLinks
        .filter(a => {
          const text = a.innerText.trim().toLowerCase();
          return text.includes('next') || text.includes('previous') || 
                 text.includes('prev') || text.includes('>>') || 
                 text.includes('<<') || text === '>' || text === '<' ||
                 text.includes('...');
        })
        .map(a => ({
          text: a.innerText.trim(),
          href: a.href,
          onclick: a.onclick ? a.onclick.toString() : null,
          disabled: a.disabled || a.classList.contains('disabled')
        }));

      // Check for current page indicator
      const boldElement = document.querySelector('b');
      if (boldElement && /^\d+$/.test(boldElement.innerText.trim())) {
        info.currentPage = boldElement.innerText.trim();
      }

      // Get the pagination container HTML
      const paginationContainer = document.querySelector('.pagination') || 
                                 document.querySelector('[class*="pag"]') ||
                                 document.querySelector('td[align="center"]');
      if (paginationContainer) {
        info.paginationHTML = paginationContainer.innerHTML.substring(0, 500) + '...';
      }

      // Check for ASP.NET form elements
      const forms = Array.from(document.querySelectorAll('form'));
      info.formElements = forms.map(form => ({
        id: form.id,
        action: form.action,
        method: form.method
      }));

      // Check for ASP.NET postback functions
      if (window.__doPostBack) {
        info.hasDoPostBack = true;
      }

      return info;
    });

    console.log('Total Opportunities:', paginationInfo.totalOpportunities);
    console.log('Current Page:', paginationInfo.currentPage || 'Not detected');
    console.log('\nPage Links Found:', paginationInfo.pageLinks.length);
    paginationInfo.pageLinks.forEach(link => {
      console.log(`  - Page ${link.text}: ${link.href ? 'href=' + link.href.substring(0, 50) + '...' : 'no href'}`);
      if (link.onclick) {
        console.log(`    onclick: ${link.onclick.substring(0, 100)}...`);
      }
    });

    console.log('\nNavigation Links Found:', paginationInfo.navigationLinks.length);
    paginationInfo.navigationLinks.forEach(link => {
      console.log(`  - "${link.text}": ${link.disabled ? 'DISABLED' : 'enabled'}`);
      if (link.onclick) {
        console.log(`    onclick: ${link.onclick.substring(0, 100)}...`);
      }
    });

    console.log('\nForms Found:', paginationInfo.formElements.length);
    paginationInfo.formElements.forEach(form => {
      console.log(`  - Form ID: ${form.id}, Action: ${form.action}`);
    });

    console.log('\nHas __doPostBack:', paginationInfo.hasDoPostBack ? 'YES' : 'NO');

    if (paginationInfo.paginationHTML) {
      console.log('\nPagination HTML Preview:');
      console.log(paginationInfo.paginationHTML);
    }

    // Try to navigate to page 2
    console.log('\n\nAttempting to navigate to page 2...');
    
    // Method 1: Try clicking page 2 link
    const page2Clicked = await page.evaluate(() => {
      const page2Link = Array.from(document.querySelectorAll('a')).find(a => a.innerText.trim() === '2');
      if (page2Link) {
        page2Link.click();
        return true;
      }
      return false;
    });

    if (page2Clicked) {
      console.log('Clicked page 2 link, waiting for navigation...');
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Navigation successful!');
      } catch (e) {
        console.log('Navigation timeout - page might have updated without full reload');
      }
    } else {
      console.log('No page 2 link found');
      
      // Method 2: Try ASP.NET postback
      console.log('\nTrying ASP.NET postback method...');
      const postbackResult = await page.evaluate(() => {
        if (typeof __doPostBack === 'function') {
          try {
            // Common ASP.NET pagination patterns
            __doPostBack('ctl00$ContentPlaceHolder1$gvOpportunities', 'Page$2');
            return 'Postback called';
          } catch (e) {
            return 'Postback error: ' + e.message;
          }
        }
        return 'No __doPostBack function found';
      });
      console.log('Postback result:', postbackResult);
    }

    // Check if we're on page 2 now
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const currentPageAfter = await page.evaluate(() => {
      const boldElement = document.querySelector('b');
      if (boldElement && /^\d+$/.test(boldElement.innerText.trim())) {
        return boldElement.innerText.trim();
      }
      return 'Not detected';
    });
    
    console.log('\nCurrent page after navigation attempt:', currentPageAfter);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testPagination();