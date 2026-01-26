const express = require('express');
const { query } = require('./lib/db');
const { getQueue } = require('./lib/queue');
const app = express();
const port = process.env.API_PORT || 3000;

app.use(express.json());

// Health Check
app.get('/health', async (req, res) => {
  // Check DB connection
  try {
    await query('SELECT 1');
    res.status(200).send('OK');
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).send('Unhealthy');
  }
});

// POST /jobs - Create a new job
app.post('/jobs', async (req, res) => {
  const { type, priority = 'default', payload } = req.body;

  // Basic Validation
  if (!type || !payload) {
    return res.status(400).json({ error: 'Type and payload are required' });
  }

  // Validate Priority
  if (priority !== 'default' && priority !== 'high') {
    return res.status(400).json({ error: "Priority must be 'default' or 'high'" });
  }

  // Validate Type (Optional here since DB enforces it, but good for UX)
  const allowedTypes = ['CSV_EXPORT', 'EMAIL_SEND'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${allowedTypes.join(', ')}` });
  }

  try {
    // 1. Insert into Database (Status: pending)
    const sql = `
      INSERT INTO jobs (type, priority, payload, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id
    `;
    const values = [type, priority, payload];
    const result = await query(sql, values);
    const job = result.rows[0];

    // 2. Enqueue to Redis
    const queue = getQueue(priority);
    await queue.add(type, { jobId: job.id, ...payload }, {
      jobId: job.id, // Use DB UUID as BullMQ Job ID for easy tracking
      attempts: 3,   // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 1000,
      }
    });

    res.status(201).json({ jobId: job.id });

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /jobs/:id - Get job details
app.get('/jobs/:id', async (req, res) => {
  const { id } = req.params;

  // Validate UUID format roughly
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid Job ID format' });
  }

  try {
    const sql = 'SELECT * FROM jobs WHERE id = $1';
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];

    // Map DB columns to response schema (camelCase)
    const response = {
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      attempts: job.attempts,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
