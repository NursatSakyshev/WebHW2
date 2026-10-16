const path = require('path');
const express = require('express');
const { pool, initDb } = require('./db');

const PORT = process.env.PORT || 3000;
const APP_NAME = process.env.APP_NAME || 'Movie Watchlist';

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.param('id', (req, res, next, id) => {
  if (!/^\d{1,9}$/.test(id)) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  next();
});

app.get('/api/info', (req, res) => {
  res.json({ appName: APP_NAME });
});

app.get('/api/movies', async (req, res) => {
  const { watched } = req.query;
  let result;
  if (watched === 'true' || watched === 'false') {
    result = await pool.query(
      'SELECT * FROM movies WHERE watched = $1 ORDER BY created_at DESC',
      [watched === 'true']
    );
  } else {
    result = await pool.query('SELECT * FROM movies ORDER BY created_at DESC');
  }
  res.json(result.rows);
});

app.post('/api/movies', async (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? '').trim();
  const year = body.year ? Number(body.year) : null;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (year !== null && !Number.isInteger(year)) {
    return res.status(400).json({ error: 'year must be an integer' });
  }
  const result = await pool.query(
    'INSERT INTO movies (title, year) VALUES ($1, $2) RETURNING *',
    [title, year]
  );
  res.status(201).json(result.rows[0]);
});

app.patch('/api/movies/:id', async (req, res) => {
  const { watched, rating } = req.body ?? {};
  if (watched != null && typeof watched !== 'boolean') {
    return res.status(400).json({ error: 'watched must be true or false' });
  }
  if (rating != null && !(Number.isInteger(rating) && rating >= 1 && rating <= 10)) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 10' });
  }
  const result = await pool.query(
    `UPDATE movies
       SET watched = COALESCE($1, watched),
           rating  = COALESCE($2, rating)
     WHERE id = $3
     RETURNING *`,
    [watched ?? null, rating ?? null, req.params.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'movie not found' });
  }
  res.json(result.rows[0]);
});

app.delete('/api/movies/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM movies WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'movie not found' });
  }
  res.status(204).end();
});

app.get('/api/stats', async (req, res) => {
  const result = await pool.query(`
    SELECT COUNT(*)::int                          AS total,
           COUNT(*) FILTER (WHERE watched)::int   AS watched,
           ROUND(AVG(rating), 1)::float           AS "averageRating"
      FROM movies
  `);
  res.json(result.rows[0]);
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`${APP_NAME} is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to the database:', err.message);
    process.exit(1);
  });
