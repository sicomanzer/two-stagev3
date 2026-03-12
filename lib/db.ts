import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'portfolio.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    current_price REAL,
    fair_price REAL,
    d0 REAL,
    g REAL,
    ks REAL,
    pe REAL,
    pbv REAL,
    de REAL,
    roa REAL,
    roe REAL,
    dividend_yield REAL,
    eps REAL,
    mos30_price REAL,
    mos30_shares INTEGER,
    mos30_cost REAL,
    mos40_price REAL,
    mos40_shares INTEGER,
    mos40_cost REAL,
    mos50_price REAL,
    mos50_shares INTEGER,
    mos50_cost REAL,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
