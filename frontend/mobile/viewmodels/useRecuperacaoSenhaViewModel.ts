import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '@/lib/api';
import { authService } from '@/services/authService';
import { primeiroRequisitoPendente } from '@/utils/senha';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tela "Esqueci minha senha": pede o e-mail e dispara o envio do código.
export function useEsqueciSenhaViewModel() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setErro('');
    const emailLimpo = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(emailLimpo)) {
      setErro('Digite um e-mail válido');
      return;
    }

    try {
      setEnviando(true);
      setMensagem(await authService.forgotPassword(emailLimpo));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar agora');
    } finally {
      setEnviando(false);
    }
  };

  return {
    email,
    setEmail,
    erro,
    mensagem,
    enviando,
    enviar,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/login')),
    irParaRedefinir: () => router.push('/redefinir-senha'),
  };
}

// Tela "Redefinir senha": o código chega por e-mail, ou já vem preenchido pelo link (resolve://redefinir-senha?token=...).
export function useRedefinirSenhaViewModel() {
  const router = useRouter();
  const { token: tokenDoLink } = useLocalSearchParams<{ token?: string }>();

  const [codigo, setCodigo] = useState(typeof tokenDoLink === 'string' ? tokenDoLink : '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [concluido, setConcluido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const redefinir = async () => {
    setErro('');

    if (!codigo.trim()) {
      setErro('Informe o código recebido por e-mail');
      return;
    }
    const pendente = primeiroRequisitoPendente(novaSenha);
    if (pendente) {
      setErro(pendente);
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem');
      return;
    }

    try {
      setEnviando(true);
      await authService.resetPassword(codigo.trim(), novaSenha);
      setConcluido(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha');
    } finally {
      setEnviando(false);
    }
  };

  return {
    codigo,
    setCodigo,
    novaSenha,
    setNovaSenha,
    confirmar,
    setConfirmar,
    erro,
    concluido,
    enviando,
    redefinir,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/login')),
    irParaLogin: () => router.replace('/login'),
  };
}
