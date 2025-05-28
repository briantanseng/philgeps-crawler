import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  development: {
    client: process.env.DATABASE_TYPE || 'sqlite3',
    connection: process.env.DATABASE_TYPE === 'postgres' ? {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DATABASE || 'philgeps'
    } : {
      filename: process.env.DATABASE_PATH || path.join(__dirname, '../../data/philgeps.db')
    },
    migrations: {
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    },
    useNullAsDefault: true
  },

  production: {
    client: process.env.DATABASE_TYPE || 'postgres',
    connection: process.env.DATABASE_TYPE === 'sqlite3' ? {
      filename: process.env.DATABASE_PATH || '/app/data/philgeps.db'
    } : process.env.DATABASE_URL || {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE || 'philgeps',
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  }
};

export default config[process.env.NODE_ENV || 'development'];