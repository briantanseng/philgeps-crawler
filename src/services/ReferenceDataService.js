import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ReferenceDataService {
  constructor() {
    this.categories = null;
    this.areas = null;
    this.loaded = false;
  }

  async loadData() {
    if (this.loaded) return;

    try {
      // Load categories
      const categoriesPath = path.join(__dirname, '../../data/philgeps-categories.json');
      const categoriesData = await fs.readFile(categoriesPath, 'utf8');
      this.categories = JSON.parse(categoriesData);

      // Load areas
      const areasPath = path.join(__dirname, '../../data/philgeps-areas.json');
      const areasData = await fs.readFile(areasPath, 'utf8');
      this.areas = JSON.parse(areasData);

      this.loaded = true;
      console.log(`Loaded ${this.categories.length} categories and ${this.areas.length} areas`);
    } catch (error) {
      console.error('Error loading reference data:', error);
      // Fallback to empty arrays
      this.categories = [];
      this.areas = [];
    }
  }

  async getCategories() {
    await this.loadData();
    return this.categories.map(cat => cat.text);
  }

  async getCategoriesWithValues() {
    await this.loadData();
    return this.categories;
  }

  async getAreas() {
    await this.loadData();
    return this.areas.map(area => area.text);
  }

  async getAreasWithValues() {
    await this.loadData();
    return this.areas;
  }

  getCategoryValue(categoryText) {
    if (!this.categories) return null;
    const category = this.categories.find(cat => cat.text === categoryText);
    return category ? category.value : null;
  }

  getAreaValue(areaText) {
    if (!this.areas) return null;
    const area = this.areas.find(a => a.text === areaText);
    return area ? area.value : null;
  }

  // Normalize category name for consistency
  normalizeCategory(categoryText) {
    if (!categoryText) return null;
    
    // Try exact match first
    if (this.categories && this.categories.find(cat => cat.text === categoryText)) {
      return categoryText;
    }

    // Try case-insensitive match
    const lowerCategory = categoryText.toLowerCase();
    const match = this.categories?.find(cat => 
      cat.text.toLowerCase() === lowerCategory
    );
    
    if (match) return match.text;

    // Try partial match
    const partialMatch = this.categories?.find(cat => 
      cat.text.toLowerCase().includes(lowerCategory) ||
      lowerCategory.includes(cat.text.toLowerCase())
    );

    return partialMatch ? partialMatch.text : categoryText;
  }

  // Normalize area name for consistency
  normalizeArea(areaText) {
    if (!areaText) return null;
    
    // Try exact match first
    if (this.areas && this.areas.find(area => area.text === areaText)) {
      return areaText;
    }

    // Try case-insensitive match
    const lowerArea = areaText.toLowerCase();
    const match = this.areas?.find(area => 
      area.text.toLowerCase() === lowerArea
    );
    
    if (match) return match.text;

    // Try partial match
    const partialMatch = this.areas?.find(area => 
      area.text.toLowerCase().includes(lowerArea) ||
      lowerArea.includes(area.text.toLowerCase())
    );

    return partialMatch ? partialMatch.text : areaText;
  }
}

// Export singleton instance
export default new ReferenceDataService();