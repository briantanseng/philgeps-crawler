import express from 'express';
import SearchService from '../services/SearchService.js';
import CrawlerService from '../services/CrawlerService.js';
import referenceDataService from '../services/ReferenceDataService.js';
import { db } from '../models/DatabaseAdapter.js';

const router = express.Router();
const searchService = new SearchService();
const crawlerService = new CrawlerService();

// Search endpoints
router.get('/opportunities/search', async (req, res) => {
  try {
    const { q, category, areaOfDelivery, minBudget, maxBudget, activeOnly, limit, offset } = req.query;
    
    const filters = {
      category,
      areaOfDelivery,
      minBudget: minBudget ? parseFloat(minBudget) : undefined,
      maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      activeOnly: activeOnly === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const results = await searchService.searchWithPagination(q || '', filters);
    const formatted = results.data.map(r => searchService.formatOpportunity(r));
    
    res.json({
      success: true,
      count: results.total,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all active opportunities
router.get('/opportunities/active', async (req, res) => {
  try {
    const { limit } = req.query;
    const results = await searchService.getActiveOpportunities({ 
      limit: limit ? parseInt(limit) : 50 
    });
    const formatted = results.map(r => searchService.formatOpportunity(r));
    
    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get opportunities by category
router.get('/opportunities/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit } = req.query;
    
    const results = await searchService.getByCategory(category, {
      limit: limit ? parseInt(limit) : 50
    });
    const formatted = results.map(r => searchService.formatOpportunity(r));
    
    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    // Use official PhilGEPS categories
    const categories = await referenceDataService.getCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all areas of delivery
router.get('/areas', async (req, res) => {
  try {
    const areas = await referenceDataService.getAreas();
    
    res.json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await searchService.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get crawl history
router.get('/crawl/history', async (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM crawl_history 
      ORDER BY crawl_date DESC 
      LIMIT 10
    `);
    const history = stmt.all();
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger manual crawl
router.post('/crawl/trigger', async (req, res) => {
  try {
    const { startPage, endPage } = req.body;
    
    // Validate parameters
    const options = {};
    if (startPage !== undefined) {
      const start = parseInt(startPage);
      if (isNaN(start) || start < 1) {
        return res.status(400).json({
          success: false,
          error: 'startPage must be a positive integer'
        });
      }
      options.startPage = start;
    }
    
    if (endPage !== undefined) {
      const end = parseInt(endPage);
      if (isNaN(end) || end < 1) {
        return res.status(400).json({
          success: false,
          error: 'endPage must be a positive integer'
        });
      }
      options.endPage = end;
    }
    
    // Validate that endPage is greater than or equal to startPage
    if (options.startPage && options.endPage && options.endPage < options.startPage) {
      return res.status(400).json({
        success: false,
        error: 'endPage must be greater than or equal to startPage'
      });
    }
    
    // Return immediately and run crawl in background
    res.json({
      success: true,
      message: 'Crawl started in background',
      options
    });

    // Run crawl asynchronously
    await crawlerService.crawlAllOpportunities(options).catch(error => {
      console.error('Background crawl failed:', error);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export opportunities as CSV
router.get('/opportunities/export', async (req, res) => {
  try {
    const { q, category, areaOfDelivery, activeOnly } = req.query;
    
    const filters = {
      category,
      areaOfDelivery,
      activeOnly: activeOnly === 'true',
      limit: 1000 // Higher limit for exports
    };

    const results = await searchService.search(q || '', filters);
    const csv = await searchService.exportToCSV(results);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="opportunities.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crawler control endpoints
router.get('/crawler/status', async (req, res) => {
  try {
    // Import app instance to access crawler state
    const app = (await import('../index.js')).default;
    
    res.json({
      success: true,
      data: {
        enabled: app.crawlerEnabled,
        isRunning: app.isCrawling,
        intervalMinutes: app.intervalMinutes,
        lastCrawl: app.lastCrawl,
        nextCrawl: app.nextCrawl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/crawler/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    const app = (await import('../index.js')).default;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled parameter must be a boolean'
      });
    }
    
    app.crawlerEnabled = enabled;
    
    if (enabled) {
      app.updateNextCrawlTime();
      console.log(`[${new Date().toISOString()}] Crawler enabled`);
    } else {
      app.nextCrawl = null;
      console.log(`[${new Date().toISOString()}] Crawler disabled`);
    }
    
    res.json({
      success: true,
      data: {
        enabled: app.crawlerEnabled,
        message: enabled ? 'Crawler enabled' : 'Crawler disabled'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/crawler/run', async (req, res) => {
  try {
    const app = (await import('../index.js')).default;
    
    if (app.isCrawling) {
      return res.status(400).json({
        success: false,
        error: 'Crawler is already running'
      });
    }
    
    // Start crawl in background
    app.runCrawl();
    
    res.json({
      success: true,
      message: 'Manual crawl started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;