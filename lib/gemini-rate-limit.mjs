// Gemini's free tier allows 20 requests per minute. All Gemini calls in a
// single app process pass through this FIFO limiter so concurrent product
// analysis cannot burst past that rolling-window limit. Embedding batches
// conservatively charge each input against the quota as well.

export const GEMINI_MAX_REQUESTS_PER_MINUTE = 20;
const WINDOW_MS = 60_000;

export function createGeminiRateLimiter({
  limit = GEMINI_MAX_REQUESTS_PER_MINUTE,
  windowMs = WINDOW_MS,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let requests = [];
  let tail = Promise.resolve();

  return async function rateLimitGemini(request, { cost = 1 } = {}) {
    if (!Number.isInteger(cost) || cost < 1 || cost > limit) {
      throw new Error(`Gemini request cost must be an integer between 1 and ${limit}.`);
    }

    let release;
    const previous = tail;
    tail = new Promise((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      for (;;) {
        const current = now();
        requests = requests.filter((entry) => current - entry.timestamp < windowMs);
        const used = requests.reduce((total, entry) => total + entry.cost, 0);

        if (used + cost <= limit) {
          requests.push({ timestamp: current, cost });
          return await request();
        }

        const waitMs = Math.max(1, requests[0].timestamp + windowMs - current);
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
