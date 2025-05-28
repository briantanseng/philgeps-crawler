#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function analyzeITBPage() {
  console.log('Analyzing ITB Page Structure');
  console.log('============================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const url = 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?menuIndex=3&refID=11912520&Result=3';
    
    console.log(`Navigating to: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extract all field labels and values
    const itbData = await page.evaluate(() => {
      const data = {};
      const fields = [];

      // Method 1: Look for table rows with labels
      document.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label = cells[0].innerText.trim();
          const value = cells[1].innerText.trim();
          
          if (label && value && label.includes(':')) {
            const cleanLabel = label.replace(':', '').trim();
            fields.push({ label: cleanLabel, value: value });
            data[cleanLabel] = value;
          }
        }
      });

      // Method 2: Look for label-value pairs in divs
      document.querySelectorAll('div').forEach(div => {
        const text = div.innerText.trim();
        if (text.includes(':') && !text.includes('\n')) {
          const parts = text.split(':');
          if (parts.length === 2) {
            const label = parts[0].trim();
            const value = parts[1].trim();
            if (label && value && !data[label]) {
              fields.push({ label, value });
              data[label] = value;
            }
          }
        }
      });

      // Method 3: Look for specific field patterns
      const allText = document.body.innerText;
      const patterns = [
        /Reference Number[:\s]+([^\n]+)/i,
        /Bid Notice Title[:\s]+([^\n]+)/i,
        /Procuring Entity[:\s]+([^\n]+)/i,
        /Area of Delivery[:\s]+([^\n]+)/i,
        /Solicitation Number[:\s]+([^\n]+)/i,
        /Trade Agreement[:\s]+([^\n]+)/i,
        /Procurement Mode[:\s]+([^\n]+)/i,
        /Classification[:\s]+([^\n]+)/i,
        /Category[:\s]+([^\n]+)/i,
        /Approved Budget[:\s]+([^\n]+)/i,
        /Delivery Period[:\s]+([^\n]+)/i,
        /Client Agency[:\s]+([^\n]+)/i,
        /Contact Person[:\s]+([^\n]+)/i,
        /Description[:\s]+([^\n]+)/i,
        /Bid Supplements[:\s]+([^\n]+)/i,
        /Document Request List[:\s]+([^\n]+)/i,
        /Pre-bid Conference[:\s]+([^\n]+)/i,
        /Bid Submission Date[:\s]+([^\n]+)/i,
        /Opening Date[:\s]+([^\n]+)/i
      ];

      patterns.forEach(pattern => {
        const match = allText.match(pattern);
        if (match) {
          const label = pattern.source.split('[')[0].trim();
          const value = match[1].trim();
          if (!data[label]) {
            fields.push({ label, value });
            data[label] = value;
          }
        }
      });

      return {
        fields: fields,
        data: data,
        pageTitle: document.title,
        fullText: allText.substring(0, 2000) // First 2000 chars for context
      };
    });

    console.log('Page Title:', itbData.pageTitle);
    console.log('\nExtracted Fields:');
    console.log('=================\n');

    itbData.fields.forEach(field => {
      console.log(`${field.label}: ${field.value.substring(0, 100)}${field.value.length > 100 ? '...' : ''}`);
    });

    console.log('\n\nStructured Data:');
    console.log(JSON.stringify(itbData.data, null, 2));

    // Check for additional sections
    const sections = await page.evaluate(() => {
      const sectionHeaders = [];
      document.querySelectorAll('h1, h2, h3, h4, b, strong').forEach(elem => {
        const text = elem.innerText.trim();
        if (text.length > 3 && text.length < 50) {
          sectionHeaders.push(text);
        }
      });
      return [...new Set(sectionHeaders)];
    });

    console.log('\n\nSection Headers Found:');
    sections.forEach(section => console.log(`- ${section}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

analyzeITBPage();