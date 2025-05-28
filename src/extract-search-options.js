#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function extractSearchOptions() {
  console.log('Extracting Category and Area of Delivery lists from PhilGEPS');
  console.log('============================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const url = 'https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesDetailedSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp';
    
    console.log(`Navigating to: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extract categories and areas
    const searchOptions = await page.evaluate(() => {
      const result = {
        categories: [],
        areasOfDelivery: []
      };

      // Extract categories
      const categorySelect = document.querySelector('select[name*="Category"], select[id*="Category"], select[name*="cat"], select[id*="cat"]');
      if (categorySelect) {
        const options = categorySelect.querySelectorAll('option');
        options.forEach(option => {
          if (option.value && option.text && option.text !== 'ALL' && option.text !== 'Select Category') {
            result.categories.push({
              value: option.value,
              text: option.text.trim()
            });
          }
        });
      }

      // Extract areas of delivery
      const areaSelect = document.querySelector('select[name*="Area"], select[id*="Area"], select[name*="location"], select[id*="location"], select[name*="Delivery"], select[id*="Delivery"]');
      if (areaSelect) {
        const options = areaSelect.querySelectorAll('option');
        options.forEach(option => {
          if (option.value && option.text && option.text !== 'ALL' && option.text !== 'Select Area') {
            result.areasOfDelivery.push({
              value: option.value,
              text: option.text.trim()
            });
          }
        });
      }

      // Fallback: Look for all selects and try to identify by content
      if (result.categories.length === 0 || result.areasOfDelivery.length === 0) {
        const allSelects = document.querySelectorAll('select');
        allSelects.forEach(select => {
          const options = Array.from(select.options).map(opt => opt.text);
          
          // Check if this might be categories (looking for known category names)
          if (options.some(opt => opt.includes('Goods') || opt.includes('Services') || opt.includes('Works'))) {
            if (result.categories.length === 0) {
              select.querySelectorAll('option').forEach(option => {
                if (option.value && option.text && option.text !== 'ALL' && !option.text.includes('Select')) {
                  result.categories.push({
                    value: option.value,
                    text: option.text.trim()
                  });
                }
              });
            }
          }
          
          // Check if this might be areas (looking for Philippine location names)
          if (options.some(opt => opt.includes('Manila') || opt.includes('Cebu') || opt.includes('Davao') || opt.includes('Province'))) {
            if (result.areasOfDelivery.length === 0) {
              select.querySelectorAll('option').forEach(option => {
                if (option.value && option.text && option.text !== 'ALL' && !option.text.includes('Select')) {
                  result.areasOfDelivery.push({
                    value: option.value,
                    text: option.text.trim()
                  });
                }
              });
            }
          }
        });
      }

      // Get labels to help identify selects
      const labels = {};
      document.querySelectorAll('label').forEach(label => {
        const text = label.innerText.trim();
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          labels[forAttr] = text;
        }
      });

      result.labels = labels;
      result.selectCount = document.querySelectorAll('select').length;

      return result;
    });

    console.log(`Found ${searchOptions.selectCount} select elements on the page\n`);

    // Save categories
    if (searchOptions.categories.length > 0) {
      console.log(`Categories found: ${searchOptions.categories.length}`);
      console.log('Sample categories:');
      searchOptions.categories.slice(0, 10).forEach(cat => {
        console.log(`  - ${cat.text}`);
      });
      if (searchOptions.categories.length > 10) {
        console.log(`  ... and ${searchOptions.categories.length - 10} more`);
      }

      // Save to file
      const categoriesFile = path.join(__dirname, '../data/philgeps-categories.json');
      await fs.writeFile(categoriesFile, JSON.stringify(searchOptions.categories, null, 2));
      console.log(`\nCategories saved to: ${categoriesFile}`);
    } else {
      console.log('No categories found - manual inspection needed');
    }

    console.log('\n---\n');

    // Save areas of delivery
    if (searchOptions.areasOfDelivery.length > 0) {
      console.log(`Areas of Delivery found: ${searchOptions.areasOfDelivery.length}`);
      console.log('Sample areas:');
      searchOptions.areasOfDelivery.slice(0, 10).forEach(area => {
        console.log(`  - ${area.text}`);
      });
      if (searchOptions.areasOfDelivery.length > 10) {
        console.log(`  ... and ${searchOptions.areasOfDelivery.length - 10} more`);
      }

      // Save to file
      const areasFile = path.join(__dirname, '../data/philgeps-areas.json');
      await fs.writeFile(areasFile, JSON.stringify(searchOptions.areasOfDelivery, null, 2));
      console.log(`\nAreas saved to: ${areasFile}`);
    } else {
      console.log('No areas found - manual inspection needed');
    }

    // If we couldn't find the data, take a screenshot for debugging
    if (searchOptions.categories.length === 0 || searchOptions.areasOfDelivery.length === 0) {
      console.log('\n---\n');
      console.log('Taking screenshot for debugging...');
      await page.screenshot({ path: 'philgeps-search-page.png', fullPage: true });
      console.log('Screenshot saved to: philgeps-search-page.png');

      // Try to extract all select options for manual inspection
      const allSelects = await page.evaluate(() => {
        const selects = [];
        document.querySelectorAll('select').forEach((select, index) => {
          const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }));
          selects.push({
            index: index,
            id: select.id,
            name: select.name,
            className: select.className,
            optionCount: options.length,
            sampleOptions: options.slice(0, 5)
          });
        });
        return selects;
      });

      console.log('\nAll select elements found:');
      allSelects.forEach(select => {
        console.log(`\nSelect #${select.index}:`);
        console.log(`  ID: ${select.id}`);
        console.log(`  Name: ${select.name}`);
        console.log(`  Class: ${select.className}`);
        console.log(`  Options: ${select.optionCount}`);
        console.log('  Sample options:');
        select.sampleOptions.forEach(opt => {
          console.log(`    - "${opt.text}" (value: ${opt.value})`);
        });
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

extractSearchOptions();