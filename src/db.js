const { Pool } = require('pg');

// All connection settings come from environment variables (see .env.example)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Create the table on startup if it doesn't exist yet
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id         SERIAL PRIMARY KEY,
      title      TEXT    NOT NULL,
      year       INTEGER,
      watched    BOOLEAN NOT NULL DEFAULT false,
      rating     INTEGER CHECK (rating BETWEEN 1 AND 10),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

module.exports = { pool, initDb };
