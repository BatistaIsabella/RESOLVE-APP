import { Response, NextFunction, Request } from 'express';
import { orgaoPorCodigo } from '../config/codigosGestor';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as authService from '../services/authService';
import * as confirmacaoService from '../services/confirmacaoEmailService';
import * as contaService from '../services/contaService';
import * as mfaService from '../services/mfaService';
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
    // Com a confirmação de e-mail ligada a resposta é a mesma para qualquer e-mail, e a conta ainda não existe para o login.
    if ('confirmacaoNecessaria' in result) return res.status(202).json(result);
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

const MENSAGEM_REENVIO = 'Se o e-mail aguardar confirmação, enviaremos um novo código.';

export async function confirmarEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body ?? {};
    if (!token) return res.status(400).json({ error: 'Campo obrigatório: token' });

    await confirmacaoService.confirmarEmail(token, req);
    return res.json({ message: 'E-mail confirmado. Faça login para entrar.' });
  } catch (err) {
    next(err);
  }
}

export async function reenviarConfirmacao(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({ error: 'Campo obrigatório: email' });
    }

    await confirmacaoService.reenviarConfirmacao(authService.normalizarEmail(email), req);
    return res.json({ message: MENSAGEM_REENVIO });
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
    await contaService.excluirConta(req.user!.userId, req.body?.senha, req.headers.authorization!);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function loginMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { desafio, codigo } = req.body ?? {};
    if (!desafio || !codigo) {
      return res.status(400).json({ error: 'Campos obrigatórios: desafio, codigo' });
    }
    return res.json(await authService.loginComMfa(desafio, codigo, req));
  } catch (err) {
    next(err);
  }
}

export async function mfaConfigurar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return res.json(await mfaService.iniciarConfiguracao(req.user!.userId));
  } catch (err) {
    next(err);
  }
}

export async function mfaAtivar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const codigosRecuperacao = await mfaService.ativar(req.user!.userId, req.body?.codigo, req);

    // Quando a MFA era obrigatória e a pessoa ainda não tinha sessão, a ativação já conclui o login.
    if (req.viaDesafio) {
      const login = await authService.loginAposConfigurarMfa(req.user!.userId, req);
      return res.json({ codigosRecuperacao, login });
    }
    return res.json({ codigosRecuperacao });
  } catch (err) {
    next(err);
  }
}

export async function mfaDesativar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await mfaService.desativar(req.user!.userId, req.body?.senha, req.body?.codigo, req);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
