import 'dotenv/config';

// Determine which database implementation to use
const useKnex = process.env.DATABASE_TYPE === 'postgres' || process.env.USE_KNEX === 'true';

let database;
let Opportunity;
let initializeDatabase;
let closeDatabase;

if (useKnex) {
  console.log(`Using Knex with ${process.env.DATABASE_TYPE || 'sqlite3'} database`);
  
  // Import Knex-based implementations
  const dbModule = await import('./db.js');
  const OpportunityModule = await import('./Opportunity.knex.js');
  
  database = dbModule.default;
  initializeDatabase = dbModule.initializeDatabase;
  closeDatabase = dbModule.closeDatabase;
  Opportunity = OpportunityModule.default;
  
} else {
  console.log('Using SQLite with better-sqlite3');
  
  // Import SQLite-based implementations
  const dbModule = await import('./database.js');
  const OpportunityModule = await import('./Opportunity.js');
  
  database = dbModule.default;
  Opportunity = OpportunityModule.default;
  
  // Create initialization function for SQLite
  initializeDatabase = async () => {
    // SQLite tables are created automatically in database.js
    console.log('SQLite database initialized');
  };
  
  closeDatabase = async () => {
    database.close();
  };
}

// Export the selected implementations
export { database as db, Opportunity, initializeDatabase, closeDatabase };
export default database;