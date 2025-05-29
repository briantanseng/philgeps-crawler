import { searchOpportunities, formatOpportunity } from '@/lib/services/searchService';
import { getDatabase } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(),
}));

describe('Search Service', () => {
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockAll: jest.Mock;

  beforeEach(() => {
    mockAll = jest.fn();
    mockPrepare = jest.fn(() => ({ all: mockAll }));
    mockDb = {
      prepare: mockPrepare,
    };
    (getDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  describe('searchOpportunities', () => {
    const mockOpportunities = [
      {
        id: 1,
        reference_number: 'REF001',
        title: 'Test Opportunity',
        procuring_entity: 'Test Entity',
        approved_budget: 100000,
        closing_date: '2025-06-01T00:00:00Z',
        itb_description: 'Test ITB Description',
      },
      {
        id: 2,
        reference_number: 'REF002',
        title: 'Another Opportunity',
        procuring_entity: 'Another Entity',
        approved_budget: 200000,
        closing_date: '2025-05-15T00:00:00Z',
        itb_description: null,
      },
    ];

    it('should search with keyword', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      const results = searchOpportunities({ keyword: 'test' });
      
      expect(mockPrepare).toHaveBeenCalled();
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('WHERE 1=1');
      expect(query).toContain('LIKE ?');
      expect(mockAll).toHaveBeenCalledWith('%test%', '%test%', '%test%');
      expect(results).toHaveLength(2);
    });

    it('should filter by category', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({ category: 'Construction' });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('category = ?');
      expect(mockAll).toHaveBeenCalledWith('Construction', 'Construction');
    });

    it('should filter by area', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({ area: 'Metro Manila' });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('area_of_delivery = ?');
      expect(mockAll).toHaveBeenCalledWith('Metro Manila', 'Metro Manila');
    });

    it('should filter by budget range', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({ budgetMin: 50000, budgetMax: 150000 });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('approved_budget >= ?');
      expect(query).toContain('approved_budget <= ?');
      expect(mockAll).toHaveBeenCalledWith(50000, 150000);
    });

    it('should filter by status', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({ status: 'active' });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('closing_date >= datetime');
    });

    it('should handle pagination', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({ page: 2, limit: 10 });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('LIMIT ?');
      expect(query).toContain('OFFSET ?');
      expect(mockAll).toHaveBeenCalledWith(10, 10);
    });

    it('should handle empty results', () => {
      mockAll.mockReturnValue([]);
      
      const results = searchOpportunities({});
      
      expect(results).toHaveLength(0);
    });

    it('should combine multiple filters', () => {
      mockAll.mockReturnValue(mockOpportunities);
      
      searchOpportunities({
        keyword: 'test',
        category: 'Construction',
        area: 'Metro Manila',
        status: 'active',
        budgetMin: 10000,
        budgetMax: 100000,
      });
      
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('LIKE ?');
      expect(query).toContain('category = ?');
      expect(query).toContain('area_of_delivery = ?');
      expect(query).toContain('closing_date >= datetime');
      expect(query).toContain('approved_budget >= ?');
      expect(query).toContain('approved_budget <= ?');
    });
  });

  describe('formatOpportunity', () => {
    it('should format opportunity with all fields', () => {
      const opportunity = {
        id: 1,
        reference_number: 'REF001',
        title: 'Test Opportunity',
        procuring_entity: 'Test Entity',
        approved_budget: 100000,
        currency: 'PHP',
        closing_date: new Date('2025-06-01T00:00:00Z'),
        itb_description: 'Test Description',
        itb_category: 'Construction',
      };
      
      const formatted = formatOpportunity(opportunity);
      
      expect(formatted.formatted_budget).toBe('PHP 100,000');
      expect(formatted.hasItbDetails).toBe(true);
      expect(formatted.is_expired).toBe(false);
      expect(typeof formatted.days_until_closing).toBe('number');
    });

    it('should handle missing budget', () => {
      const opportunity = {
        id: 1,
        reference_number: 'REF001',
        title: 'Test',
        procuring_entity: 'Test',
        approved_budget: null,
        closing_date: new Date(),
      };
      
      const formatted = formatOpportunity(opportunity);
      
      expect(formatted.formatted_budget).toBe('N/A');
    });

    it('should handle expired opportunities', () => {
      const opportunity = {
        id: 1,
        reference_number: 'REF001',
        title: 'Test',
        procuring_entity: 'Test',
        closing_date: new Date('2020-01-01'),
      };
      
      const formatted = formatOpportunity(opportunity);
      
      expect(formatted.is_expired).toBe(true);
      expect(formatted.days_until_closing).toBeLessThan(0);
    });

    it('should detect closing soon status', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const opportunity = {
        id: 1,
        reference_number: 'REF001',
        title: 'Test',
        procuring_entity: 'Test',
        closing_date: tomorrow,
      };
      
      const formatted = formatOpportunity(opportunity);
      
      expect(formatted.is_closing_soon).toBe(true);
      expect(formatted.days_until_closing).toBeLessThanOrEqual(3);
    });

    it('should handle no ITB details', () => {
      const opportunity = {
        id: 1,
        reference_number: 'REF001',
        title: 'Test',
        procuring_entity: 'Test',
        closing_date: new Date(),
      };
      
      const formatted = formatOpportunity(opportunity);
      
      expect(formatted.hasItbDetails).toBe(false);
    });
  });
});