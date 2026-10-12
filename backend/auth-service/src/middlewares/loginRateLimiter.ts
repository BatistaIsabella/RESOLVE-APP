import { rateLimit } from 'express-rate-limit';
import { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'sem-email';
    return `${req.ip ?? ''}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
    });
  },
});
