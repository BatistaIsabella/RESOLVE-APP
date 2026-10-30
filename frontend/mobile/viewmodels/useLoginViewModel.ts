import { useState } from 'react';
import { useRouter } from 'expo-router';

import { getPostLoginRoute, ResultadoLogin, useAuthContext } from '@/contexts/AuthContext';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';

export function useLoginViewModel() {
  const router = useRouter();
  const login = useAuthContext().login;
  const isLoading = useAuthContext().isLoading;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [erro, setErro] = useState('');

  const toggleManterConectado = () => setManterConectado((v) => !v);

  const handleLogin = async () => {
    setErro('');

    const emailDigitado = email.trim();
    const emailNormalizado = emailDigitado.toLowerCase();
    if (!emailNormalizado || !senha) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setRemembered(manterConectado);
      let resultado: ResultadoLogin;
      try {
        resultado = await login(emailNormalizado, senha);
      } catch (err) {
        const recusado = err instanceof ApiError && err.status === 401;
        if (!recusado || emailDigitado === emailNormalizado) throw err;
        resultado = await login(emailDigitado, senha);
      }

      // Gestor com verificação em duas etapas ainda precisa informar o código antes de entrar.
      if (resultado.tipo === 'confirmar-email') {
        router.push({ pathname: '/confirmar-email', params: { email: emailNormalizado } });
      } else if (resultado.tipo === 'mfa') {
        router.push({ pathname: '/mfa', params: { desafio: resultado.desafio } });
      } else if (resultado.tipo === 'mfa-configuracao') {
        router.push({ pathname: '/mfa-configurar', params: { desafio: resultado.desafio } });
      } else {
        router.replace(getPostLoginRoute(resultado.role));
      }
    } catch (err) {
      // A senha estava certa, mas o e-mail do cadastro ainda não foi confirmado.
      if (err instanceof ApiError && err.codigo === 'EMAIL_NAO_CONFIRMADO') {
        router.push({ pathname: '/confirmar-email', params: { email: emailNormalizado } });
        return;
      }
      setErro(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goToCadastro = () => router.push('/cadastro');
  const goToEsqueciSenha = () => router.push('/esqueci-senha');

  return {
    email,
    setEmail,
    senha,
    setSenha,
    manterConectado,
    toggleManterConectado,
    erro,
    isLoading,
    handleLogin,
    goBack,
    goToCadastro,
    goToEsqueciSenha,
  };
}
