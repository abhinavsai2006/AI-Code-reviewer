const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { REDIS_URL } = require('./config');

let reviewQueue = null;
let isRedisConnected = false;
let redisConnection = null;

try {
    redisConnection = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: 2000,
        reconnectOnError: () => false
    });

    redisConnection.on('connect', () => {
        isRedisConnected = true;
        console.log('Connected to Redis server. Initializing BullMQ queue...');
    });

    redisConnection.on('error', (err) => {
        isRedisConnected = false;
    });

    reviewQueue = new Queue('review-queue', { connection: redisConnection });
} catch (err) {
    console.warn('Failed to start Redis connection for queue. Falling back to in-memory queue.');
}

// In-Memory job worker fallback list
const inMemoryJobs = [];

const addReviewJob = async (reviewId, data) => {
    if (isRedisConnected && reviewQueue) {
        try {
            await reviewQueue.add('review-job', { reviewId, ...data });
            console.log(`Job enqueued via BullMQ for review_id: ${reviewId}`);
            return;
        } catch (err) {
            console.error('BullMQ enqueue failed, falling back to local thread execution:', err);
        }
    }
    
    // In-memory async job simulation fallback
    console.log(`Local Thread: Scheduling background job execution for review_id: ${reviewId}`);
    setTimeout(async () => {
        const { processReviewJob } = require('./worker');
        try {
            await processReviewJob(reviewId, data);
        } catch (err) {
            console.error(`Local background job execution failed for review_id ${reviewId}:`, err);
        }
    }, 100);
};

module.exports = {
    addReviewJob,
    reviewQueue,
    isRedisConnected: () => isRedisConnected,
    redisConnection
};
