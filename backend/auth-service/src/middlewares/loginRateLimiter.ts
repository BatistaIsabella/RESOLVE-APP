import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

/**
 * Limita tentativas de login por IP + email, pra dificultar força bruta numa
 * conta específica sem travar todo mundo atrás do mesmo IP (ex: o próprio
 * api-gateway fazendo proxy, ou uma rede compartilhada). Isso é além do
 * rate limit genérico já existente no api-gateway (200 req/15min por IP),
 * que protege a API como um todo mas não impede tentar várias senhas na
 * mesma conta.
 */
export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // só tentativas com falha (401, 400...) contam pro limite
  keyGenerator: (req: Request) => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'sem-email';
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
    });
  },
});
