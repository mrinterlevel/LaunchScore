// Gemini's free tier allows 20 requests per minute. All Gemini calls in a
// single app process pass through this FIFO limiter so concurrent product
// analysis cannot burst past that rolling-window limit.

export const GEMINI_MAX_REQUESTS_PER_MINUTE = 20;
const WINDOW_MS = 60_000;

export function createGeminiRateLimiter({
  limit = GEMINI_MAX_REQUESTS_PER_MINUTE,
  windowMs = WINDOW_MS,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let timestamps = [];
  let tail = Promise.resolve();

  return async function rateLimitGemini(request) {
    let release;
    const previous = tail;
    tail = new Promise((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      for (;;) {
        const current = now();
        timestamps = timestamps.filter((timestamp) => current - timestamp < windowMs);

        if (timestamps.length < limit) {
          timestamps.push(current);
          return await request();
        }

        const waitMs = Math.max(1, timestamps[0] + windowMs - current);
        await sleep(waitMs);
      }
    } finally {
      release();
    }
  };
}

// Module caching makes this shared by synthesis, embeddings, and insights in
// one Next.js server process. A multi-instance deployment needs a central
// queue/rate limiter if it must enforce one quota across every instance.
export const rateLimitGemini = createGeminiRateLimiter();
