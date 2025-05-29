import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Statistics from '@/components/Statistics';

// Mock fetch
global.fetch = jest.fn();

describe('Statistics Component', () => {
  const mockStats = {
    success: true,
    data: {
      total: 150,
      active: 75,
      categories: 10,
      entities: 25,
    },
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => mockStats,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<Statistics />);
    const loadingElement = screen.getByRole('article').querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should display statistics after loading', async () => {
    render(<Statistics />);
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Total Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Active Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Procuring Entities')).toBeInTheDocument();
  });

  it('should format large numbers with commas', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          total: 1234567,
          active: 1000,
          categories: 100,
          entities: 500,
        },
      }),
    });
    
    render(<Statistics />);
    
    await waitFor(() => {
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    const user = userEvent.setup();
    render(<Statistics />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    expect(global.fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<Statistics />);
    
    await waitFor(() => {
      const loadingElement = screen.queryByRole('article')?.querySelector('.animate-pulse');
      expect(loadingElement).not.toBeInTheDocument();
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load statistics:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should auto-refresh every 30 seconds', async () => {
    jest.useFakeTimers();
    
    render(<Statistics />);
    
    // Initial load
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Fast-forward another 30 seconds
    jest.advanceTimersByTime(30000);
    
    expect(global.fetch).toHaveBeenCalledTimes(3);
    
    jest.useRealTimers();
  });

  it('should cleanup interval on unmount', () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    
    const { unmount } = render(<Statistics />);
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});