#!/usr/bin/env node

import 'dotenv/config';
import SearchService from './services/SearchService.js';
import readline from 'readline';
import fs from 'fs/promises';

class SearchCLI {
  constructor() {
    this.searchService = new SearchService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('PhilGEPS Search Tool');
    console.log('===================\n');

    while (true) {
      const choice = await this.showMenu();

      switch (choice) {
        case '1':
          await this.searchByKeywords();
          break;
        case '2':
          await this.searchByCategory();
          break;
        case '3':
          await this.searchByBudget();
          break;
        case '4':
          await this.showActiveOpportunities();
          break;
        case '5':
          await this.showStatistics();
          break;
        case '6':
          await this.exportResults();
          break;
        case '0':
          console.log('Goodbye!');
          this.rl.close();
          return;
        default:
          console.log('Invalid choice. Please try again.\n');
      }
    }
  }

  showMenu() {
    return new Promise(resolve => {
      console.log('\nMain Menu:');
      console.log('1. Search by keywords');
      console.log('2. Search by category');
      console.log('3. Search by budget range');
      console.log('4. Show active opportunities');
      console.log('5. Show statistics');
      console.log('6. Export search results');
      console.log('0. Exit');
      
      this.rl.question('\nEnter your choice: ', resolve);
    });
  }

  ask(question) {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  async searchByKeywords() {
    const keywords = await this.ask('\nEnter keywords (space-separated): ');
    const keywordArray = keywords.trim().split(/\s+/).filter(k => k.length > 0);
    
    if (keywordArray.length === 0) {
      console.log('No keywords provided.');
      return;
    }

    console.log(`\nSearching for: ${keywordArray.join(', ')}...`);
    const results = this.searchService.getByKeywords(keywordArray, { limit: 20 });
    
    this.displayResults(results);
  }

  async searchByCategory() {
    const categories = this.searchService.getCategories();
    
    if (categories.length === 0) {
      console.log('\nNo categories found. Please run a crawl first.');
      return;
    }

    console.log('\nAvailable categories:');
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat}`);
    });

    const choice = await this.ask('\nEnter category number (or 0 to cancel): ');
    const index = parseInt(choice) - 1;

    if (index < 0 || index >= categories.length) {
      console.log('Cancelled.');
      return;
    }

    const selectedCategory = categories[index];
    console.log(`\nSearching in category: ${selectedCategory}...`);
    const results = this.searchService.getByCategory(selectedCategory, { limit: 20 });
    
    this.displayResults(results);
  }

  async searchByBudget() {
    const minBudget = await this.ask('\nEnter minimum budget (or press Enter to skip): ');
    const maxBudget = await this.ask('Enter maximum budget (or press Enter to skip): ');

    const min = minBudget ? parseFloat(minBudget) : null;
    const max = maxBudget ? parseFloat(maxBudget) : null;

    console.log('\nSearching by budget range...');
    const results = this.searchService.getByBudgetRange(min, max, { limit: 20 });
    
    this.displayResults(results);
  }

  async showActiveOpportunities() {
    console.log('\nFetching active opportunities...');
    const results = this.searchService.getActiveOpportunities({ limit: 20 });
    
    this.displayResults(results);
  }

  async showStatistics() {
    const stats = this.searchService.getStatistics();
    
    console.log('\nDatabase Statistics:');
    console.log('===================');
    console.log(`Total opportunities: ${stats.total}`);
    console.log(`Active opportunities: ${stats.active}`);
    console.log(`Unique categories: ${stats.categories}`);
    console.log(`Procuring entities: ${stats.entities}`);
  }

  displayResults(results) {
    if (results.length === 0) {
      console.log('\nNo results found.');
      return;
    }

    console.log(`\nFound ${results.length} opportunities:\n`);
    
    results.forEach((opp, index) => {
      const formatted = this.searchService.formatOpportunity(opp);
      
      console.log(`${index + 1}. ${opp.title}`);
      console.log(`   Reference: ${opp.reference_number}`);
      console.log(`   Entity: ${opp.procuring_entity}`);
      console.log(`   Budget: ${formatted.formatted_budget}`);
      console.log(`   Closing: ${opp.closing_date} (${formatted.days_until_closing} days)`);
      
      if (formatted.is_closing_soon) {
        console.log('   ⚠️  CLOSING SOON!');
      } else if (formatted.is_expired) {
        console.log('   ❌ EXPIRED');
      }
      
      console.log('');
    });

    this.lastResults = results;
  }

  async exportResults() {
    if (!this.lastResults || this.lastResults.length === 0) {
      console.log('\nNo results to export. Please perform a search first.');
      return;
    }

    const filename = await this.ask('\nEnter filename for export (without extension): ');
    if (!filename) {
      console.log('Export cancelled.');
      return;
    }

    const csvContent = this.searchService.exportToCSV(this.lastResults);
    const filepath = `${filename}.csv`;

    try {
      await fs.writeFile(filepath, csvContent);
      console.log(`\nResults exported to: ${filepath}`);
    } catch (error) {
      console.error('Export failed:', error.message);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SearchCLI();
  cli.run().catch(console.error);
}