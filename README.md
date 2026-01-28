# Asynchronous Job Processing System

A robust, containerized backend system logic for processing long-running tasks asynchronously. Built with **Node.js**, **Express**, **Redis (BullMQ)**, and **PostgreSQL**.

---

## 🚀 Features

-   **Asynchronous Processing**: Decouples heavy tasks from the API using a producer-consumer pattern.
-   **Priority Queues**: Jobs can be `high` or `default` priority. Workers strictly prioritize high-priority jobs.
-   **Reliability**: Automatic retries (up to 3 attempts) with exponential backoff for failed jobs.
-   **Persistence**: Full job lifecycle (`pending` -> `processing` -> `completed`/`failed`) tracked in PostgreSQL.
-   **Job Handlers**:
    -   `CSV_EXPORT`: Generates CSV files from JSON data.
    -   `EMAIL_SEND`: Sends emails via a mock SMTP server (MailHog).
-   **Containerized**: Fully orchestrated environment using Docker Compose.

---

## 🛠️ Tech Stack

-   **Runtime**: Node.js
-   **API Framework**: Express.js
-   **Queue Engine**: BullMQ (Redis)
-   **Database**: PostgreSQL
-   **Email Testing**: MailHog
-   **Docker**: Docker Compose for orchestration

---

## 📂 Project Structure

```
├── src
│   ├── lib
│   │   ├── db.js         # PostgreSQL connection pool
│   │   └── queue.js      # BullMQ queue configuration
│   ├── app.js            # API Service (Producer)
│   └── worker.js         # Worker Service (Consumer)
├── seeds
│   └── 01_schema.sql     # Database schema and initialization
├── output                # Shared volume for generated CSVs
├── docker-compose.yml    # Service orchestration
└── .env                  # Environment variables
```

---

## ⚡ Quick Start

### Prerequisites
-   Docker & Docker Compose installed.

### 1. Setup Environment
Clone the repo and configure the environment:
```bash
git clone https://github.com/SabbellaLaharika/GPP-Task-7-Build-an-Asynchronous-Job-Processing-System-with-Redis-and-Worker-Queues.git
cd GPP-Task-7-Build-an-Asynchronous-Job-Processing-System-with-Redis-and-Worker-Queues
cp .env.example .env
# The default settings work out-of-the-box with Docker.
```

### 2. Start Services
Build and start the system:
```bash
docker-compose up --build
```
*Wait ~10 seconds for Database and Redis to be ready.*

---

## 📖 API Documentation

### Create a Job
**POST** `/jobs`

**Body Parameters:**
-   `type`: (Required) `CSV_EXPORT` or `EMAIL_SEND`
-   `payload`: (Required) JSON object specific to the job type.
-   `priority`: (Optional) `default` or `high`. Defaults to `default`.

#### Example: CSV Export
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CSV_EXPORT",
    "payload": {
      "data": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
    }
  }'
```

#### Example: Email Send
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EMAIL_SEND",
    "priority": "high",
    "payload": {
      "to": "alice@example.com",
      "subject": "Welcome",
      "body": "Your report is ready."
    }
  }'
```

### Get Job Status
**GET** `/jobs/:id`

Returns the current status, result (if completed), or error (if failed).

```bash
curl http://localhost:3000/jobs/<JOB_UUID>
```

**Response Example:**
```json
{
  "id": "a1b2c3d4-...",
  "type": "EMAIL_SEND",
  "status": "completed",
  "result": { "messageId": "<...>" },
  "attempts": 1
}
```

---

## ✅ Verification Steps

You can verify the system functionality manually:

1.  **Check Services**:
    ```bash
    docker-compose ps
    # Ensure app, worker, db, redis, and mailhog are 'Up' and 'healthy'.
    ```

2.  **Verify CSV Generation**:
    -   Create a `CSV_EXPORT` job.
    -   Check the `./output` folder in your project root.
    -   Confirm a new `.csv` file appears with the Job ID as the filename.

3.  **Verify Email Sending**:
    -   Create a `EMAIL_SEND` job.
    -   Open [http://localhost:8025](http://localhost:8025).
    -   Confirm the email appears in the Inbox.

4.  **Verify High Priority**:
    -   Allow the queue to backup (e.g., stop the worker container).
    -   Queue 5 `default` priority jobs.
    -   Queue 1 `high` priority job.
    -   Start the worker.
    -   Observe logs: The `high` priority job will be processed first.

---

## ⚙️ Implementation Details

### Separation of Concerns
The **API (`app`)** and **Worker (`worker`)** run in separate containers. They share no state other than Redis (for the queue) and PostgreSQL (for data persistence).

### Resilience
-   **Graceful Shutdown**: The worker handles `SIGTERM` signals to finish active jobs before exiting.
-   **Dead Letter Logic**: Jobs that fail 3 times are strictly marked as `failed` in the database for manual inspection.
-   **Structured Logging**: Logs are JSON-formatted for easy parsing and debugging.

---

## ❓ Troubleshooting

### Services fail to start?
-   **Port Conflicts**: Ensure ports `3000` (API), `5432` (Postgres), `6379` (Redis), or `8025` (MailHog) are not already in use by other applications on your host machine.
-   **Solution**: Stop conflicting services or modify `docker-compose.yml` port mappings.

### Database Connection Refused?
-   Check container status: `docker-compose ps`.
-   If `db` is restarting, check logs: `docker-compose logs db`.
-   Ensure `.env` variables match `docker-compose.yml` usage.

### Job stuck in 'pending'?
-   Check if the worker is running: `docker-compose logs worker`.
-   If logs show "Connection Refused" to Redis, ensure Redis service is healthy.

### Email not showing in MailHog?
-   Ensure you are checking the correct URL: `http://localhost:8025`.
-   Verify the job payload has the correct `to` address.
