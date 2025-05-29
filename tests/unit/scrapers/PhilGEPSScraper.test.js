import PhilGEPSScraper from '@/src/scrapers/PhilGEPSScraper';
import axios from 'axios';

jest.mock('axios');

describe('PhilGEPSScraper', () => {
  let scraper;
  const mockAxios = axios;

  beforeEach(() => {
    jest.clearAllMocks();
    scraper = new PhilGEPSScraper();
  });

  describe('extractOpportunities', () => {
    const mockHtml = `
      <html>
        <body>
          <table id="GridView1">
            <tr>
              <td><a href="SplashBidNoticeAbstractUI.aspx?refID=12345">View Details</a></td>
              <td>Construction of School Building</td>
              <td>Department of Education</td>
              <td>01/06/2025 12:00 AM</td>
            </tr>
            <tr>
              <td><a href="SplashBidNoticeAbstractUI.aspx?refID=12346">View Details</a></td>
              <td>IT Equipment Supply</td>
              <td>Department of Health</td>
              <td>15/06/2025 5:00 PM</td>
            </tr>
          </table>
          <span id="lblTotalOpportunities">Total: 100</span>
          <span id="lblPageNumbers">Page 1 of 5</span>
        </body>
      </html>
    `;

    it('should extract opportunities from HTML', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await scraper.extractOpportunities();

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );

      expect(result.opportunities).toHaveLength(2);
      expect(result.opportunities[0]).toMatchObject({
        reference_number: '12345',
        title: 'Construction of School Building',
        procuring_entity: 'Department of Education',
        closing_date: expect.any(Date),
      });

      expect(result.totalOpportunities).toBe(100);
      expect(result.totalPages).toBe(5);
    });

    it('should handle missing elements gracefully', async () => {
      const incompleteHtml = `
        <html>
          <body>
            <table id="GridView1">
              <tr>
                <td></td>
                <td>Incomplete Opportunity</td>
                <td></td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: incompleteHtml,
      });

      const result = await scraper.extractOpportunities();

      expect(result.opportunities).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse dates correctly', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await scraper.extractOpportunities();

      const firstOpp = result.opportunities[0];
      expect(firstOpp.closing_date).toBeInstanceOf(Date);
      expect(firstOpp.closing_date.getDate()).toBe(1);
      expect(firstOpp.closing_date.getMonth()).toBe(5); // June (0-indexed)
      expect(firstOpp.closing_date.getFullYear()).toBe(2025);
    });

    it('should extract category from title', async () => {
      const htmlWithCategory = `
        <html>
          <body>
            <table id="GridView1">
              <tr>
                <td><a href="test.aspx?refID=123">View</a></td>
                <td>[Construction] Building Project</td>
                <td>Test Entity</td>
                <td>01/06/2025 12:00 AM</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: htmlWithCategory,
      });

      const result = await scraper.extractOpportunities();

      expect(result.opportunities[0].category).toBe('Construction');
    });

    it('should handle network errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await scraper.extractOpportunities();

      expect(result.opportunities).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to fetch');
    });

    it('should handle non-200 status codes', async () => {
      mockAxios.get.mockResolvedValue({
        status: 404,
        data: 'Not found',
      });

      const result = await scraper.extractOpportunities();

      expect(result.opportunities).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should extract pagination info', async () => {
      const htmlWithPagination = `
        <html>
          <body>
            <table id="GridView1"></table>
            <span id="lblPageNumbers">1 2 3 4 5 ... 50</span>
            <span id="lblTotalOpportunities">Total: 1000</span>
          </body>
        </html>
      `;

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: htmlWithPagination,
      });

      const result = await scraper.extractOpportunities();

      expect(result.totalPages).toBe(50);
      expect(result.totalOpportunities).toBe(1000);
    });
  });

  describe('parseClosingDate', () => {
    it('should parse various date formats', () => {
      const testCases = [
        { input: '01/06/2025 12:00 AM', expected: new Date(2025, 5, 1, 0, 0) },
        { input: '15/12/2025 5:30 PM', expected: new Date(2025, 11, 15, 17, 30) },
        { input: '07/03/2025 11:59 PM', expected: new Date(2025, 2, 7, 23, 59) },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scraper.parseClosingDate(input);
        expect(result.getTime()).toBe(expected.getTime());
      });
    });

    it('should handle invalid dates', () => {
      const invalidDates = ['invalid', '', null, undefined];

      invalidDates.forEach(input => {
        const result = scraper.parseClosingDate(input);
        expect(result).toBeNull();
      });
    });
  });
});