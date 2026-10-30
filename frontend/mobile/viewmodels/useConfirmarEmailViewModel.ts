import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '@/lib/api';
import { authService } from '@/services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tela "Confirmar e-mail": o código chega por e-mail, ou já vem preenchido pelo link (resolve://confirmar-email?token=...).
// O e-mail chega pelos parâmetros quando a pessoa vem do cadastro ou do login; sem ele, a tela o pede para o reenvio.
export function useConfirmarEmailViewModel() {
  const router = useRouter();
  const { token: tokenDoLink, email: emailDaRota } = useLocalSearchParams<{ token?: string; email?: string }>();

  const [codigo, setCodigo] = useState(typeof tokenDoLink === 'string' ? tokenDoLink : '');
  const [email, setEmail] = useState(typeof emailDaRota === 'string' ? emailDaRota : '');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [concluido, setConcluido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const confirmar = async () => {
    setErro('');
    setAviso('');

    if (!codigo.trim()) {
      setErro('Informe o código recebido por e-mail');
      return;
    }

    try {
      setEnviando(true);
      await authService.confirmEmail(codigo.trim());
      setConcluido(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível confirmar agora');
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setErro('');
    setAviso('');
    const emailLimpo = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(emailLimpo)) {
      setErro('Informe o e-mail do cadastro para reenviar o código');
      return;
    }

    try {
      setReenviando(true);
      setAviso(await authService.resendConfirmation(emailLimpo));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível reenviar agora');
    } finally {
      setReenviando(false);
    }
  };

  return {
    codigo,
    setCodigo,
    email,
    setEmail,
    pedeEmail: typeof emailDaRota !== 'string' || emailDaRota.length === 0,
    erro,
    aviso,
    concluido,
    enviando,
    reenviando,
    confirmar,
    reenviar,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/login')),
    irParaLogin: () => router.replace('/login'),
  };
}
