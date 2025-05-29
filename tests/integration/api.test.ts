import { NextRequest } from 'next/server';

// Mock database before imports
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(() => ({
    prepare: jest.fn(() => ({
      all: jest.fn(() => []),
      get: jest.fn(() => ({ count: 10 })),
      run: jest.fn(),
    })),
    pragma: jest.fn(),
    exec: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/statistics', () => {
    it('should return statistics', async () => {
      const { GET } = await import('@/app/api/statistics/route');
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('active');
      expect(data.data).toHaveProperty('categories');
      expect(data.data).toHaveProperty('entities');
    });
  });

  describe('/api/opportunities/search', () => {
    it('should search opportunities with keyword', async () => {
      const { GET } = await import('@/app/api/opportunities/search/route');
      const request = new NextRequest('http://localhost:3000/api/opportunities/search?keyword=test');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should handle filters', async () => {
      const { GET } = await import('@/app/api/opportunities/search/route');
      const request = new NextRequest('http://localhost:3000/api/opportunities/search?category=construction&status=active&budgetMin=10000&budgetMax=100000');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle pagination', async () => {
      const { GET } = await import('@/app/api/opportunities/search/route');
      const request = new NextRequest('http://localhost:3000/api/opportunities/search?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('/api/opportunities/export', () => {
    it('should export opportunities as CSV', async () => {
      const { GET } = await import('@/app/api/opportunities/export/route');
      const request = new NextRequest('http://localhost:3000/api/opportunities/export?keyword=test');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('opportunities');
    });
  });

  describe('/api/categories', () => {
    it('should return categories', async () => {
      const { GET } = await import('@/app/api/categories/route');
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('/api/areas', () => {
    it('should return areas', async () => {
      const { GET } = await import('@/app/api/areas/route');
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('/api/crawler/status', () => {
    it('should return crawler status', async () => {
      const { GET } = await import('@/app/api/crawler/status/route');
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('enabled');
      expect(data.data).toHaveProperty('intervalMinutes');
      expect(data.data).toHaveProperty('isRunning');
    });
  });

  describe('/api/crawler/toggle', () => {
    it('should toggle crawler status', async () => {
      const { POST } = await import('@/app/api/crawler/toggle/route');
      const request = new NextRequest('http://localhost:3000/api/crawler/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
      });
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('enabled');
    });

    it('should handle invalid request', async () => {
      const { POST } = await import('@/app/api/crawler/toggle/route');
      const request = new NextRequest('http://localhost:3000/api/crawler/toggle', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('/api/crawler/run', () => {
    it('should trigger manual crawl', async () => {
      // Mock the crawler service
      jest.mock('@/src/services/CrawlerService', () => ({
        default: jest.fn().mockImplementation(() => ({
          crawlAllOpportunities: jest.fn().mockResolvedValue({
            totalFound: 10,
            newRecords: 5,
            updatedRecords: 3,
            errors: 0,
          }),
        })),
      }));

      const { POST } = await import('@/app/api/crawler/run/route');
      const response = await POST();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});