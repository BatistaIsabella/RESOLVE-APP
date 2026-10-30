import { useState } from 'react';
import { Linking, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getPostLoginRoute } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { ConfiguracaoMfa, contaService } from '@/services/contaService';
import { codigoDoAppValido, codigoMfaValido } from '@/utils/mfa';

function mensagemDe(err: unknown, padrao: string) {
  return err instanceof ApiError ? err.message : padrao;
}

function parametroTexto(valor: string | string[] | undefined): string {
  return typeof valor === 'string' ? valor : '';
}

// Segunda etapa do login: o código do app autenticador (ou um código de recuperação).
export function useMfaLoginViewModel() {
  const router = useRouter();
  const { concluirLoginMfa } = useAuth();
  const desafio = parametroTexto(useLocalSearchParams<{ desafio?: string }>().desafio);

  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setErro('');
    if (!codigoMfaValido(codigo)) {
      setErro('Digite os 6 números do app autenticador ou um código de recuperação');
      return;
    }

    try {
      setEnviando(true);
      const role = await concluirLoginMfa(desafio, codigo.trim());
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(mensagemDe(err, 'Não foi possível confirmar o código'));
    } finally {
      setEnviando(false);
    }
  };

  return {
    codigo,
    setCodigo,
    erro,
    enviando,
    confirmar,
    desafioAusente: desafio === '',
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/login')),
  };
}

type Etapa = 'segredo' | 'codigo' | 'recuperacao';

// Ativação da MFA. Funciona de dois jeitos: pelo "Meus dados" (já há sessão) ou logo após o login de um gestor,
// quando a MFA é obrigatória (ainda não há sessão e o servidor entregou um desafio de configuração).
export function useMfaConfigurarViewModel() {
  const router = useRouter();
  const { iniciarSessao, role, token } = useAuth();
  const desafio = parametroTexto(useLocalSearchParams<{ desafio?: string }>().desafio) || undefined;

  const [etapa, setEtapa] = useState<Etapa>('segredo');
  const [configuracao, setConfiguracao] = useState<ConfiguracaoMfa | null>(null);
  const [codigo, setCodigo] = useState('');
  const [codigosRecuperacao, setCodigosRecuperacao] = useState<string[]>([]);
  const [respostaLogin, setRespostaLogin] = useState<Awaited<ReturnType<typeof contaService.mfaAtivar>>['login']>();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const gerarSegredo = async () => {
    setErro('');
    try {
      setCarregando(true);
      setConfiguracao(await contaService.mfaConfigurar(desafio));
    } catch (err) {
      setErro(mensagemDe(err, 'Não foi possível iniciar a configuração'));
    } finally {
      setCarregando(false);
    }
  };

  // Abre o aplicativo autenticador instalado no celular já com a conta cadastrada.
  const abrirNoAutenticador = async () => {
    if (!configuracao) return;
    try {
      await Linking.openURL(configuracao.otpauthUri);
    } catch {
      setErro('Nenhum app autenticador foi encontrado. Instale um (Google Authenticator, Microsoft Authenticator ou similar) e digite a chave manualmente.');
    }
  };

  const confirmar = async () => {
    setErro('');
    if (!codigoDoAppValido(codigo)) {
      setErro('Digite os 6 números mostrados no app autenticador');
      return;
    }

    try {
      setCarregando(true);
      const resposta = await contaService.mfaAtivar(codigo.trim(), desafio);
      setCodigosRecuperacao(resposta.codigosRecuperacao);
      setRespostaLogin(resposta.login);
      setEtapa('recuperacao');
    } catch (err) {
      setErro(mensagemDe(err, 'Não foi possível confirmar o código'));
    } finally {
      setCarregando(false);
    }
  };

  const compartilharCodigos = () =>
    Share.share({
      title: 'Códigos de recuperação - RESOLVE',
      message: `Códigos de recuperação do RESOLVE (cada um vale uma vez):\n\n${codigosRecuperacao.join('\n')}`,
    });

  // Só depois de guardar os códigos: no fluxo obrigatório abre a sessão agora; no "Meus dados" volta para a tela.
  const concluir = () => {
    if (respostaLogin) {
      const papel = iniciarSessao(respostaLogin);
      router.replace(getPostLoginRoute(papel));
    } else {
      router.replace('/perfil');
    }
  };

  return {
    etapa,
    irParaCodigo: () => setEtapa('codigo'),
    configuracao,
    gerarSegredo,
    abrirNoAutenticador,
    codigo,
    setCodigo,
    confirmar,
    codigosRecuperacao,
    compartilharCodigos,
    concluir,
    erro,
    carregando,
    obrigatoria: desafio !== undefined,
    semAcesso: desafio === undefined && !token,
    goBack: () => (router.canGoBack() ? router.back() : router.replace(role ? getPostLoginRoute(role) : '/login')),
  };
}
