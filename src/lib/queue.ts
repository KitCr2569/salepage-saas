// ═══════════════════════════════════════════════════════════════
// Simple Queue — Retry logic for outbound message sending
// ═══════════════════════════════════════════════════════════════

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

interface QueueJob<T> {
    id: string;
    data: T;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    createdAt: Date;
}

type JobHandler<T> = (data: T) => Promise<void>;

/**
 * In-memory retry queue for outbound sends.
 * In production, replace with Redis/BullMQ.
 */
export class RetryQueue<T> {
    private queue: QueueJob<T>[] = [];
    private processing = false;
    private handler: JobHandler<T>;
    private onFailure?: (job: QueueJob<T>) => void;

    constructor(handler: JobHandler<T>, onFailure?: (job: QueueJob<T>) => void) {
        this.handler = handler;
        this.onFailure = onFailure;
    }

    /**
     * Add a job to the queue
     */
    enqueue(id: string, data: T, maxAttempts: number = MAX_RETRY_ATTEMPTS): void {
        this.queue.push({
            id,
            data,
            attempts: 0,
            maxAttempts,
            createdAt: new Date(),
        });

        console.log(`[Queue] Job ${id} enqueued. Queue size: ${this.queue.length}`);
        this.process();
    }

    /**
     * Process queue items
     */
    private async process(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const job = this.queue[0]!;
            job.attempts++;

            try {
                console.log(`[Queue] Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
                await this.handler(job.data);
                console.log(`[Queue] ✅ Job ${job.id} completed`);
                this.queue.shift(); // Remove successful job
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                job.lastError = errorMessage;

                console.error(`[Queue] ❌ Job ${job.id} failed: ${errorMessage}`);

                if (job.attempts >= job.maxAttempts) {
                    console.error(`[Queue] 🚫 Job ${job.id} exhausted all retries`);
                    this.queue.shift();
                    this.onFailure?.(job);
                } else {
                    console.log(`[Queue] ⏳ Job ${job.id} will retry in ${RETRY_DELAY_MS}ms`);
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }

        this.processing = false;
    }

    /**
     * Get current queue size
     */
    get size(): number {
        return this.queue.length;
    }
}
