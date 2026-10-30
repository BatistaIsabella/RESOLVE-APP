import { Router } from 'express';
import {
  register,
  login,
  logout,
  esqueciSenha,
  redefinirSenha,
  confirmarEmail,
  reenviarConfirmacao,
  obterConta,
  atualizarConta,
  alterarSenha,
  aceitarTermos,
  excluirConta,
  loginMfa,
  mfaConfigurar,
  mfaAtivar,
  mfaDesativar,
} from '../controllers/authController';
import { authMiddleware, sessaoOuDesafioDeConfiguracao } from '../middlewares/authMiddleware';
import { limiteRecuperacao } from '../middlewares/limiteRecuperacaoMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/login/mfa', limiteRecuperacao, loginMfa);
router.post('/logout', authMiddleware, logout);

router.post('/forgot-password', limiteRecuperacao, esqueciSenha);
router.post('/reset-password', limiteRecuperacao, redefinirSenha);

router.post('/confirmar-email', limiteRecuperacao, confirmarEmail);
router.post('/reenviar-confirmacao', limiteRecuperacao, reenviarConfirmacao);

router.get('/me', authMiddleware, obterConta);
router.patch('/me', authMiddleware, atualizarConta);
router.delete('/me', authMiddleware, excluirConta);
router.post('/me/senha', authMiddleware, alterarSenha);
router.post('/aceite-termos', authMiddleware, aceitarTermos);

// Verificação em duas etapas (gestores)
router.post('/mfa/configurar', sessaoOuDesafioDeConfiguracao, mfaConfigurar);
router.post('/mfa/ativar', sessaoOuDesafioDeConfiguracao, mfaAtivar);
router.post('/mfa/desativar', authMiddleware, mfaDesativar);

export default router;
