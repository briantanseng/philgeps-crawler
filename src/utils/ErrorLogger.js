import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ErrorLogger {
  constructor(logType = 'general') {
    this.logType = logType;
    this.logDir = path.join(__dirname, '../../logs');
    this.currentLogFile = null;
    this.errors = [];
    this.startTime = new Date();
  }

  async initialize() {
    // Ensure logs directory exists
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.logDir, `${this.logType}-${timestamp}.log`);
    
    // Write header
    const header = [
      '='.repeat(80),
      `${this.logType.toUpperCase()} ERROR LOG`,
      `Started: ${new Date().toISOString()}`,
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      '='.repeat(80),
      ''
    ].join('\n');
    
    await this.writeToFile(header);
  }

  async logError(context, error, additionalData = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      },
      additionalData,
      sequenceNumber: this.errors.length + 1
    };

    this.errors.push(errorEntry);

    // Format error for log file
    const logEntry = [
      `[ERROR #${errorEntry.sequenceNumber}] ${errorEntry.timestamp}`,
      `Context: ${context}`,
      `Message: ${error.message}`,
      error.code ? `Code: ${error.code}` : '',
      Object.keys(additionalData).length > 0 ? `Additional Data: ${JSON.stringify(additionalData, null, 2)}` : '',
      'Stack Trace:',
      error.stack || 'No stack trace available',
      '-'.repeat(80),
      ''
    ].filter(line => line).join('\n');

    await this.writeToFile(logEntry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${this.logType}] ${context}:`, error.message);
    }
    
    return errorEntry;
  }

  async logWarning(context, message, data = {}) {
    const warningEntry = {
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
      type: 'WARNING'
    };

    const logEntry = [
      `[WARNING] ${warningEntry.timestamp}`,
      `Context: ${context}`,
      `Message: ${message}`,
      Object.keys(data).length > 0 ? `Data: ${JSON.stringify(data, null, 2)}` : '',
      '-'.repeat(40),
      ''
    ].filter(line => line).join('\n');

    await this.writeToFile(logEntry);
  }

  async logInfo(context, message, data = {}) {
    const infoEntry = {
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
      type: 'INFO'
    };

    const logEntry = [
      `[INFO] ${infoEntry.timestamp}`,
      `Context: ${context}`,
      `Message: ${message}`,
      Object.keys(data).length > 0 ? `Data: ${JSON.stringify(data, null, 2)}` : '',
      ''
    ].filter(line => line).join('\n');

    await this.writeToFile(logEntry);
  }

  async finalize(summary = {}) {
    const duration = (new Date() - this.startTime) / 1000;
    const footer = [
      '',
      '='.repeat(80),
      'ERROR LOG SUMMARY',
      '='.repeat(80),
      `Total Errors: ${this.errors.length}`,
      `Duration: ${duration.toFixed(2)} seconds`,
      `Completed: ${new Date().toISOString()}`,
      '',
      'Error Breakdown by Context:',
      ...this.getErrorBreakdown(),
      '',
      'Summary Data:',
      JSON.stringify(summary, null, 2),
      '='.repeat(80)
    ].join('\n');

    await this.writeToFile(footer);
    
    // Create summary file if there were errors
    if (this.errors.length > 0) {
      await this.createSummaryFile();
    }
    
    return {
      logFile: this.currentLogFile,
      errorCount: this.errors.length,
      duration,
      errors: this.errors
    };
  }

  getErrorBreakdown() {
    const breakdown = {};
    this.errors.forEach(error => {
      breakdown[error.context] = (breakdown[error.context] || 0) + 1;
    });
    
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([context, count]) => `  - ${context}: ${count} errors`);
  }

  async createSummaryFile() {
    const summaryFile = this.currentLogFile.replace('.log', '-summary.json');
    const summary = {
      logType: this.logType,
      startTime: this.startTime,
      endTime: new Date(),
      duration: (new Date() - this.startTime) / 1000,
      totalErrors: this.errors.length,
      errorsByContext: this.errors.reduce((acc, error) => {
        acc[error.context] = (acc[error.context] || 0) + 1;
        return acc;
      }, {}),
      errors: this.errors.map(error => ({
        timestamp: error.timestamp,
        context: error.context,
        message: error.error.message,
        additionalData: error.additionalData
      }))
    };
    
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
  }

  async writeToFile(content) {
    if (!this.currentLogFile) {
      await this.initialize();
    }
    
    try {
      await fs.appendFile(this.currentLogFile, content + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Static method to clean old logs
  static async cleanOldLogs(daysToKeep = 7) {
    const logDir = path.join(__dirname, '../../logs');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    try {
      const files = await fs.readdir(logDir);
      
      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }
}

// Create specialized error loggers
export class CrawlerErrorLogger extends ErrorLogger {
  constructor() {
    super('crawler');
  }

  async logCrawlError(url, error, pageData = {}) {
    return await this.logError(`Crawling ${url}`, error, {
      url,
      page: pageData.page,
      referenceNumber: pageData.referenceNumber,
      ...pageData
    });
  }

  async logParseError(url, field, error, htmlSnippet = '') {
    return await this.logError(`Parsing ${field} from ${url}`, error, {
      url,
      field,
      htmlSnippet: htmlSnippet.substring(0, 200) + '...'
    });
  }
}

export class DownloadErrorLogger extends ErrorLogger {
  constructor() {
    super('download');
  }

  async logDownloadError(url, error, attemptNumber = 1) {
    return await this.logError(`Downloading ${url}`, error, {
      url,
      attemptNumber,
      statusCode: error.response?.status,
      headers: error.response?.headers
    });
  }

  async logSaveError(filePath, error) {
    return await this.logError(`Saving file ${filePath}`, error, {
      filePath,
      diskSpace: process.platform === 'win32' ? 'N/A' : await this.getDiskSpace()
    });
  }

  async getDiskSpace() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('df -h .');
      return stdout;
    } catch {
      return 'Unable to get disk space';
    }
  }
}