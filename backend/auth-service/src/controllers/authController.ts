import { Response, NextFunction, Request } from 'express';
import { orgaoPorCodigo } from '../config/codigosGestor';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as authService from '../services/authService';
import * as contaService from '../services/contaService';
import * as recuperacaoService from '../services/recuperacaoSenhaService';

const MENSAGEM_REDEFINICAO = 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, email, senha, papel, codigoAcesso, aceiteTermos, versaoTermos } = req.body;

    if (!nome || !email || !senha || !papel) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel' });
    }
    if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string') {
      return res.status(400).json({ error: 'nome, email e senha devem ser texto' });
    }
    if (papel !== 'cidadao' && papel !== 'gestor') {
      return res.status(400).json({ error: 'papel deve ser "cidadao" ou "gestor"' });
    }

    // O código de acesso define a qual órgão o gestor fica vinculado.
    let orgao: string | null = null;
    if (papel === 'gestor') {
      orgao = orgaoPorCodigo(codigoAcesso);
      if (!orgao) {
        return res.status(403).json({ error: 'Código de acesso de gestor inválido ou ausente' });
      }
    }

    const result = await authService.register(
      { nome, email, senha, papel, orgao, aceiteTermos: aceiteTermos === true, versaoTermos },
      req
    );
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, senha' });
    }
    if (typeof email !== 'string' || typeof senha !== 'string') {
      return res.status(400).json({ error: 'email e senha devem ser texto' });
    }

    const result = await authService.login(email, senha, req);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.userId, req);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function esqueciSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({ error: 'Campo obrigatório: email' });
    }

    await recuperacaoService.solicitarRedefinicao(email, req);
    return res.json({ message: MENSAGEM_REDEFINICAO });
  } catch (err) {
    next(err);
  }
}

export async function redefinirSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Campos obrigatórios: token, novaSenha' });
    }

    await recuperacaoService.redefinirSenha(token, novaSenha, req);
    return res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  } catch (err) {
    next(err);
  }
}

export async function obterConta(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return res.json(await contaService.obterConta(req.user!.userId));
  } catch (err) {
    next(err);
  }
}

export async function atualizarConta(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { nome, email } = req.body ?? {};
    return res.json(await contaService.atualizarConta(req.user!.userId, { nome, email }, req));
  } catch (err) {
    next(err);
  }
}

export async function alterarSenha(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { senhaAtual, novaSenha } = req.body ?? {};
    return res.json(await contaService.alterarSenha(req.user!.userId, senhaAtual, novaSenha, req));
  } catch (err) {
    next(err);
  }
}

export async function aceitarTermos(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return res.json(await contaService.aceitarTermos(req.user!.userId, req.body?.versao, req));
  } catch (err) {
    next(err);
  }
}

export async function excluirConta(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await contaService.excluirConta(req.user!.userId, req.body?.senha, req.headers.authorization!, req);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
