import { Router } from 'express';
import { authMiddleware, apenascidadao } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { atualizarPrioridadeDenuncia } from '../controllers/gestorController';
import {
  createDenuncia,
  listMinhasDenuncias,
  listarFeedDenuncias,
  getDenunciaDetalhes,
  atualizarDenuncia,
  excluirDenuncia,
} from '../controllers/cidadaoController';
import {
  atualizarStatusDenuncia,
  listarTodasDenuncias,
  getDenunciaDetalhesGestor,
  excluirDenunciaGestor,
} from '../controllers/gestorController';
import { createDemand } from '../controllers/demandController';

const router = Router();

// 1. ROTAS DO GESTOR (Sempre primeiro, porque são mais específicas)
router.get('/gestor/demands', authMiddleware, roleMiddleware('gestor'), listarTodasDenuncias);
router.get('/gestor', authMiddleware, roleMiddleware('gestor'), listarTodasDenuncias);
router.get('/gestor/:id', authMiddleware, roleMiddleware('gestor'), getDenunciaDetalhesGestor);

router.patch('/gestor/:id/status', authMiddleware, roleMiddleware('gestor'), atualizarStatusDenuncia);
router.patch('/gestor/:id/prioridade', authMiddleware, roleMiddleware('gestor'), atualizarPrioridadeDenuncia);
router.delete('/gestor/:id', authMiddleware, roleMiddleware('gestor'), excluirDenunciaGestor);

// 2. ROTAS DO CIDADÃO (Estáticas e depois as dinâmicas)
router.post('/', authMiddleware, roleMiddleware('cidadao'), createDenuncia);
router.get('/demands/feed', authMiddleware, roleMiddleware('cidadao'), listarFeedDenuncias);
router.get('/demands', authMiddleware, roleMiddleware('cidadao'), listMinhasDenuncias);
router.get('/my-demands', authMiddleware, roleMiddleware('cidadao'), listMinhasDenuncias);
router.get('/feed', authMiddleware, roleMiddleware('cidadao'), listarFeedDenuncias);

// 3. ROTA DINÂMICA COMPLETA (Sempre por ÚLTIMO no arquivo)
// Se essa rota ficar em cima, ela tenta "comer" o /gestor/:id achando que "gestor" é o ID da denúncia.
router.get('/:id', authMiddleware, roleMiddleware('cidadao'), getDenunciaDetalhes);
router.patch('/:id', authMiddleware, roleMiddleware('cidadao'), atualizarDenuncia);
router.delete('/:id', authMiddleware, roleMiddleware('cidadao'), excluirDenuncia);


export default router;