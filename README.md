# Asynchronous Job Processing System

A robust, containerized backend system for processing long-running tasks asynchronously using Node.js, Express, BullMQ (Redis), and PostgreSQL.

## Overview
This system decouples task submission from execution. The API accepts jobs and enqueues them into Redis. A dedicated worker process consumes these jobs, executes them (CSV generation, Email sending), and updates the status in a PostgreSQL database.

## Prerequisites
- **Docker** and **Docker Compose** installed on your machine.

## Quick Start
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <project-folder>
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    # The default values in .env.example work out-of-the-box with Docker Compose.
    ```

3.  **Start Services**:
    Run the application using Docker Compose:
    ```bash
    docker-compose up --build
    ```
    *This will start the API (port 3000), Worker, Postgres (port 5432), Redis, and MailHog (port 8025).*

## API Documentation

### Create a Job
**Endpoint**: `POST /jobs`

**Headers**: `Content-Type: application/json`

**Body**:
```json
{
  "type": "CSV_EXPORT", // or "EMAIL_SEND"
  "priority": "default", // or "high"
  "payload": { ... }
}
```

**Example (CSV Export)**:
```json
{
  "type": "CSV_EXPORT",
  "payload": {
    "data": [
      {"name": "Alice", "age": 30},
      {"name": "Bob", "age": 25}
    ]
  }
}
```

**Example (Email Send)**:
```json
{
  "type": "EMAIL_SEND",
  "payload": {
     "to": "user@example.com",
     "subject": "Hello",
     "body": "World"
  }
}
```

### Get Job Status
**Endpoint**: `GET /jobs/:id`

**Response**:
```json
{
  "id": "uuid...",
  "type": "CSV_EXPORT",
  "status": "completed", 
  "result": { "filePath": "..." },
  "error": null,
  "attempts": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Verification Steps

### 1. Verify Services
Run `docker-compose ps` to ensure all 5 services (`app`, `worker`, `db`, `redis`, `mailhog`) are `Up` and `healthy`.

### 2. Verify Database
The `jobs` table is automatically created on startup. You can inspect it:
```bash
docker-compose exec db psql -U user -d jobs_db -c "SELECT * FROM jobs;"
```

### 3. Verify Job Processing
1.  **Submit a CSV Job**:
    ```bash
    curl -X POST http://localhost:3000/jobs -H "Content-Type: application/json" -d '{"type": "CSV_EXPORT", "payload": {"data": [{"a":1}]}}'
    ```
2.  **Check Status**: Use the returned `jobId` to call `GET /jobs/:id`. Status should cycle `pending` -> `processing` -> `completed`.
3.  **Check Output**: The generated CSV will be in the `./output` directory of your project.

4.  **Submit an Email Job**:
    ```bash
    curl -X POST http://localhost:3000/jobs -H "Content-Type: application/json" -d '{"type": "EMAIL_SEND", "payload": {"to": "test@test.com", "subject": "Hi", "body": "msg"}}'
    ```
5.  **Check Email**: Open [http://localhost:8025](http://localhost:8025) to see the email in MailHog.

## Implementation Details
-   **Architecture**: Producer-Consumer pattern.
-   **Priority Queues**: Workers strictly prioritize the `high_priority` queue over `default`.
-   **Reliability**: Jobs are retried up to 3 times with exponential backoff before failing.
-   **Persistence**: PostgreSQL stores the authoritative state of every job.
