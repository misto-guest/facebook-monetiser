/**
 * Database Utility - Async wrapper for SQLite
 * Provides Promise-based interface for cleaner async/await code
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../utils/config');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath || config.database.path;
    this.db = null;
    this.isOpen = false;
  }

  /**
   * Open database connection
   */
  open() {
    return new Promise((resolve, reject) => {
      if (this.isOpen) {
        return resolve(this);
      }

      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err.message);
          return reject(err);
        }
        
        this.isOpen = true;
        console.log('Connected to SQLite database:', this.dbPath);
        
        // Enable WAL mode for better performance
        this.db.run('PRAGMA journal_mode=WAL;');
        
        resolve(this);
      });
    });
  }

  /**
   * Run a query (INSERT, UPDATE, DELETE)
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ 
          lastID: this.lastID, 
          changes: this.changes 
        });
      });
    });
  }

  /**
   * Get a single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  /**
   * Get multiple rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  /**
   * Execute multiple SQL statements
   */
  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  /**
   * Run a transaction with multiple statements
   */
  transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION;');
        
        try {
          const results = [];
          
          const runQuery = async (index) => {
            if (index >= queries.length) {
              this.db.run('COMMIT;', (err) => {
                if (err) return reject(err);
                resolve(results);
              });
              return;
            }

            const query = queries[index];
            this.db.run(query.sql, query.params, function(err) {
              if (err) {
                this.db.run('ROLLBACK;', () => {});
                return reject(err);
              }
              results.push({ lastID: this.lastID, changes: this.changes });
              runQuery(index + 1);
            });
          };

          runQuery(0);
        } catch (err) {
          this.db.run('ROLLBACK;', () => {});
          reject(err);
        }
      });
    });
  }

  /**
   * Initialize schema
   */
  async initSchema(schemaPath) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await this.exec(schema);
    console.log('Database schema initialized successfully');
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!this.isOpen || !this.db) {
        return resolve();
      }

      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          return reject(err);
        }
        this.isOpen = false;
        console.log('Database connection closed');
        resolve();
      });
    });
  }

  /**
   * Get database for Express middleware (legacy compatibility)
   */
  getDb() {
    return this.db;
  }
}

// Export singleton instance
const db = new Database();

module.exports = {
  Database,
  db,
  // Legacy function for route compatibility
  getDb: () => db.getDb()
};
