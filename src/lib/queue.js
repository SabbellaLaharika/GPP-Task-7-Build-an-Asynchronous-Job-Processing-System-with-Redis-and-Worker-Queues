const { Queue, QueueEvents } = require('bullmq');

// Redis connection details from environment variables
const connection = {
    url: process.env.REDIS_URL,
};

// Create queues for different priorities
// We use a single 'jobs' queue logic but BullMQ supports priorities natively,
// OR we can use separate queues as implied by "high_priority queue" requirement.
// Requirement says: "The job is added to the high_priority queue in Redis. Otherwise, it is added to the default queue."
// This implies TWO distinct queues: 'high_priority' and 'default'.

const defaultQueue = new Queue('default', { connection });
const highPriorityQueue = new Queue('high_priority', { connection });

// Helper to get the appropriate queue based on priority string
const getQueue = (priority) => {
    if (priority === 'high') {
        return highPriorityQueue;
    }
    return defaultQueue;
};

module.exports = {
    defaultQueue,
    highPriorityQueue,
    getQueue,
    connection, // Export connection for Worker to use with Workers
};
