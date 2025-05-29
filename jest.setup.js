// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_TYPE = 'sqlite3';
process.env.DATABASE_PATH = ':memory:';
process.env.CRAWL_INTERVAL_MINUTES = '60';
process.env.MAX_PAGES_TO_CRAWL = '10';
process.env.REQUEST_DELAY_MS = '100';

// Mock fetch for tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});