import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  esqueciSenha,
  redefinirSenha,
  obterConta,
  atualizarConta,
  alterarSenha,
  aceitarTermos,
  excluirConta,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Limite por IP nas rotas que disparam e-mail ou aceitam token de redefinição.
// O bloqueio por conta do login fica no authService (tentativasLoginService).
const limiteRecuperacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RECUPERACAO_MAX_POR_JANELA ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Muitas solicitações. Tente novamente em alguns minutos.' });
  },
});

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

router.post('/forgot-password', limiteRecuperacao, esqueciSenha);
router.post('/reset-password', limiteRecuperacao, redefinirSenha);

router.get('/me', authMiddleware, obterConta);
router.patch('/me', authMiddleware, atualizarConta);
router.delete('/me', authMiddleware, excluirConta);
router.post('/me/senha', authMiddleware, alterarSenha);
router.post('/aceite-termos', authMiddleware, aceitarTermos);

export default router;
