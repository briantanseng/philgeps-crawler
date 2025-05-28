import axios from 'axios';
import http from 'http';
import https from 'https';

// Create custom agents with connection pooling and keep-alive
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'fifo'
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
  timeout: 60000,
  rejectUnauthorized: false, // For self-signed certificates
  scheduling: 'fifo'
});

// Create axios instance with custom configuration
const httpClient = axios.create({
  timeout: 60000,
  maxRedirects: 5,
  httpAgent,
  httpsAgent,
  validateStatus: (status) => status < 500,
  decompress: true,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024,
  // Retry configuration
  retry: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive'
  }
});

// Add request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    console.log(`HTTP Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => {
    console.log(`HTTP Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Log the error
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', config.url);
    } else if (error.code === 'ENOTFOUND') {
      console.error('DNS lookup failed:', config.url);
    } else if (error.code === 'ECONNRESET') {
      console.error('Connection reset:', config.url);
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout:', config.url);
    } else {
      console.error('HTTP error:', error.message);
    }
    
    // Retry logic
    if (!config || !config.retry) {
      return Promise.reject(error);
    }
    
    config.__retryCount = config.__retryCount || 0;
    
    if (config.__retryCount >= config.retry) {
      return Promise.reject(error);
    }
    
    config.__retryCount += 1;
    
    // Create new promise to handle retry
    const backoff = new Promise((resolve) => {
      const delay = config.retryDelay(config.__retryCount) + Math.random() * 1000;
      console.log(`Retrying request in ${Math.round(delay)}ms... (attempt ${config.__retryCount}/${config.retry})`);
      setTimeout(() => resolve(), delay);
    });
    
    // Return the promise to retry the request after the delay
    await backoff;
    return httpClient(config);
  }
);

export default httpClient;