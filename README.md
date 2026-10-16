# WebHW2 — Movie Watchlist (Docker Compose)

A multi-container web application: a **Node.js (Express) backend** with a small web UI
and a **PostgreSQL** database, started together with Docker Compose.

You can add movies you want to watch, mark them as watched, rate them from 1 to 10,
delete them and see statistics. All data is stored in PostgreSQL.

## Architecture

```
 Browser ──► localhost:8080 ──► backend (Express, port 3000) ──► db (PostgreSQL, port 5432)
                                     │                                 │
                                     └──────── app-network ────────────┘
                                                                       │
                                                         named volume: db-data
```

| Service   | Image / build          | Description                                        |
|-----------|------------------------|----------------------------------------------------|
| `backend` | built from `Dockerfile`| REST API + static front-end, published on host port `APP_PORT` |
| `db`      | `postgres:16-alpine`   | Database, reachable only inside `app-network` by the hostname `db` |

- The backend waits for the database to become **healthy** (`depends_on: condition: service_healthy`).
- Database files live in the **named volume `db-data`**, so data survives `docker compose down` and recreating containers.

## API

| Method   | Endpoint             | Description                                   |
|----------|----------------------|-----------------------------------------------|
| `GET`    | `/api/movies`        | List movies (`?watched=true` / `?watched=false` to filter) |
| `POST`   | `/api/movies`        | Add a movie — body: `{"title": "Inception", "year": 2010}` |
| `PATCH`  | `/api/movies/:id`    | Update — body: `{"watched": true, "rating": 9}` |
| `DELETE` | `/api/movies/:id`    | Delete a movie                                |
| `GET`    | `/api/stats`         | Total, watched count and average rating       |
| `GET`    | `/api/info`          | App configuration (name)                      |
| `GET`    | `/health`            | Health check (app + database connection)      |

## Environment variables

Configuration is stored in a `.env` file, which is **not committed to Git**.
`.env.example` shows the required variables without real credentials.

| Variable      | Example           | Description                          |
|---------------|-------------------|--------------------------------------|
| `APP_NAME`    | `Movie Watchlist` | Name shown in the UI                 |
| `APP_PORT`    | `8080`            | Host port for the backend            |
| `DB_USER`     | `movies_user`     | PostgreSQL user                      |
| `DB_PASSWORD` | —                 | PostgreSQL password (set your own)   |
| `DB_NAME`     | `movies`          | PostgreSQL database name             |

## How to run

1. Create the `.env` file and set a password:

   ```bash
   cp .env.example .env
   # edit .env and change DB_PASSWORD
   ```

2. Start the whole application:

   ```bash
   docker compose up
   ```

   (add `-d` to run in the background, `--build` to rebuild after code changes)

3. Open http://localhost:8080

### Try the API with curl

```bash
curl -X POST http://localhost:8080/api/movies \
  -H "Content-Type: application/json" \
  -d '{"title": "Interstellar", "year": 2014}'

curl http://localhost:8080/api/movies
curl http://localhost:8080/api/stats
```

### Check data persistence

```bash
docker compose down      # stops and removes containers (volume is kept)
docker compose up -d     # creates new containers
curl http://localhost:8080/api/movies   # the data is still there
```

To delete **all data** including the volume: `docker compose down -v`.

### Useful commands

```bash
docker compose ps                  # status of services
docker compose logs -f backend     # backend logs
docker compose exec db psql -U movies_user -d movies -c "SELECT * FROM movies;"
```

## Project structure

```
.
├── src/
│   ├── server.js      # Express app and API routes
│   └── db.js          # PostgreSQL connection pool and table creation
├── public/index.html  # Web UI
├── Dockerfile         # Backend image
├── compose.yaml       # backend + db services, network, volume
├── .env.example       # Example configuration (no real secrets)
├── .dockerignore
├── .gitignore
└── package.json
```
