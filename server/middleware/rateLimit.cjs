function createRateLimiter({ windowMs, max }) {
  const requests = new Map();

  return (request, response, next) => {
    const now = Date.now();
    const key = `${request.ip}:${request.baseUrl || ''}${request.route?.path || request.path}`;
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    requests.set(key, entry);

    if (entry.count > max) {
      response.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return response.status(429).json({ message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' });
    }

    if (requests.size > 10000) {
      for (const [requestKey, value] of requests) {
        if (value.resetAt <= now) requests.delete(requestKey);
      }
    }
    next();
  };
}

module.exports = { createRateLimiter };
