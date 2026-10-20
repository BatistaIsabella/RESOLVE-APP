import jwt from 'jsonwebtoken';
import { categoriasDoOrgao, ORGAO_PADRAO } from '../config/orgaos';
import { config, getJwtSecret } from '../config/env';
import { versaoSessaoAtual } from './sessaoService';

export type Papel = 'cidadao' | 'gestor';

export interface UsuarioParaToken {
  id: number;
  email: string;
  papel: 'CIDADAO' | 'GESTOR';
  orgao: string | null;
}

export interface Claims {
  userId: number;
  papel: Papel;
  email: string;
  orgao?: string;
  categorias?: string[];
  sv?: number;
  iat?: number;
}

export function orgaoEfetivo(usuario: Pick<UsuarioParaToken, 'papel' | 'orgao'>): string | null {
  if (usuario.papel !== 'GESTOR') return null;
  return usuario.orgao ?? ORGAO_PADRAO;
}

export async function emitirToken(usuario: UsuarioParaToken): Promise<string> {
  const papel = usuario.papel.toLowerCase() as Papel;
  const orgao = orgaoEfetivo(usuario);
  const sv = await versaoSessaoAtual(usuario.id);

  const claims: Claims = { userId: usuario.id, papel, email: usuario.email };

  if (orgao) {
    claims.orgao = orgao;
    // Sem a lista de categorias o gestor enxerga todas (gestão geral).
    const categorias = categoriasDoOrgao(orgao);
    if (categorias) claims.categorias = categorias;
  }
  if (sv !== null) claims.sv = sv;

  return jwt.sign(claims, getJwtSecret(), { expiresIn: config.jwtExpiracao() as jwt.SignOptions['expiresIn'] });
}
