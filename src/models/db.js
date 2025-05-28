import knex from 'knex';
import config from '../config/knexfile.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Knex
const db = knex(config);

// Create data directory for SQLite if needed
if (config.client === 'sqlite3') {
  const dbPath = config.connection.filename;
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Run migrations
export async function initializeDatabase() {
  try {
    console.log(`Initializing ${config.client} database...`);
    
    // Run migrations
    await db.migrate.latest();
    console.log('Database migrations completed');
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('Database connection established');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Helper function to handle database-specific queries
export function getDb() {
  return db;
}

// Database type helper
export function isPostgres() {
  return config.client === 'pg' || config.client === 'postgresql';
}

export function isSQLite() {
  return config.client === 'sqlite3';
}

// Close database connection
export async function closeDatabase() {
  await db.destroy();
}

export default db;