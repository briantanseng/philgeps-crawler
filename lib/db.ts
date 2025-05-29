import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'philgeps.db');
    
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Set journal mode for better performance
    db.pragma('journal_mode = WAL');
    
    // Initialize database if needed
    initializeDatabase(db);
  }
  
  return db;
}

function initializeDatabase(database: Database.Database) {
  // Check if opportunities table exists
  const tableExists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='opportunities'"
  ).get();
  
  if (!tableExists) {
    console.log('Creating database schema...');
    
    // Import and run the schema directly
    try {
      // Import the schema content
      const { readFileSync } = require('fs');
      const schemaPath = path.join(process.cwd(), 'src', 'migrations', 'schema.js');
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      
      // Extract SQL statements from the schema file
      const sqlStatements = schemaContent
        .split('db.exec(`')
        .slice(1)
        .map((part: string) => part.split('`);')[0])
        .filter((sql: string) => sql.trim());
      
      // Execute each SQL statement
      sqlStatements.forEach((sql: string) => {
        try {
          database.exec(sql);
        } catch (err) {
          console.error('SQL execution error:', err);
        }
      });
      
      console.log('Database schema created successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      
      // Fallback: create minimal schema
      database.exec(`
        CREATE TABLE IF NOT EXISTS opportunities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference_number TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          procuring_entity TEXT NOT NULL,
          category TEXT,
          area_of_delivery TEXT,
          approved_budget REAL,
          currency TEXT DEFAULT 'PHP',
          closing_date DATETIME,
          publish_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS crawl_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          opportunities_found INTEGER DEFAULT 0,
          new_opportunities INTEGER DEFAULT 0,
          updated_opportunities INTEGER DEFAULT 0,
          errors INTEGER DEFAULT 0,
          duration_seconds REAL,
          status TEXT,
          error_message TEXT
        );
      `);
    }
  }
}

// Close database connection on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (db) {
      db.close();
    }
  });
}