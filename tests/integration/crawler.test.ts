import CrawlerService from '@/src/services/CrawlerService';
import { Opportunity } from '@/src/models/DatabaseAdapter';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('@/src/models/DatabaseAdapter', () => ({
  Opportunity: {
    upsert: jest.fn(),
    findByReferenceNumber: jest.fn(),
  },
  db: {
    prepare: jest.fn(() => ({
      run: jest.fn(),
    })),
  },
}));

describe('Crawler Service Integration', () => {
  let crawlerService: CrawlerService;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    crawlerService = new CrawlerService();
  });

  describe('crawlAllOpportunities', () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <table id="GridView1">
            <tr>
              <td><a href="test.aspx?refID=12345">View Details</a></td>
              <td>Test Opportunity Title</td>
              <td>Test Entity</td>
              <td>01/06/2025 12:00 AM</td>
            </tr>
            <tr>
              <td><a href="test.aspx?refID=12346">View Details</a></td>
              <td>Another Opportunity</td>
              <td>Another Entity</td>
              <td>15/06/2025 12:00 AM</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    it('should crawl and save opportunities', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtmlResponse,
      });

      (Opportunity.upsert as jest.Mock).mockResolvedValue({
        isNew: true,
        isUpdated: false,
      });

      const result = await crawlerService.crawlAllOpportunities();

      expect(mockAxios.get).toHaveBeenCalled();
      expect(Opportunity.upsert).toHaveBeenCalledTimes(2);
      expect(result.totalFound).toBe(2);
      expect(result.newRecords).toBe(2);
      expect(result.updatedRecords).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle update existing opportunities', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtmlResponse,
      });

      (Opportunity.upsert as jest.Mock)
        .mockResolvedValueOnce({ isNew: false, isUpdated: true })
        .mockResolvedValueOnce({ isNew: true, isUpdated: false });

      const result = await crawlerService.crawlAllOpportunities();

      expect(result.newRecords).toBe(1);
      expect(result.updatedRecords).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtmlResponse,
      });

      (Opportunity.upsert as jest.Mock)
        .mockResolvedValueOnce({ isNew: true, isUpdated: false })
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await crawlerService.crawlAllOpportunities();

      expect(result.totalFound).toBe(2);
      expect(result.newRecords).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should handle network errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await crawlerService.crawlAllOpportunities();

      expect(result.totalFound).toBe(0);
      expect(result.errors).toBeGreaterThan(0);
    });

    it('should handle empty response', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: '<html><body>No data</body></html>',
      });

      const result = await crawlerService.crawlAllOpportunities();

      expect(result.totalFound).toBe(0);
      expect(result.newRecords).toBe(0);
    });

    it('should record crawl history', async () => {
      const mockPrepare = jest.fn(() => ({ run: jest.fn() }));
      const mockDb = { prepare: mockPrepare };
      
      // Override the db mock for this test
      jest.spyOn(crawlerService as any, 'recordCrawlHistory');
      
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtmlResponse,
      });

      await crawlerService.crawlAllOpportunities();

      expect((crawlerService as any).recordCrawlHistory).toHaveBeenCalled();
    });
  });

  describe('HTTP request handling', () => {
    it('should include proper headers', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
      });

      await crawlerService.crawlAllOpportunities();

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
          }),
        })
      );
    });

    it('should handle different HTTP status codes', async () => {
      mockAxios.get.mockResolvedValue({
        status: 404,
        data: 'Not found',
      });

      const result = await crawlerService.crawlAllOpportunities();

      expect(result.errors).toBeGreaterThan(0);
    });
  });
});