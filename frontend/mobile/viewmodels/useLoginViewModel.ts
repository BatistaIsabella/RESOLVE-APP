import { useState } from 'react';
import { useRouter } from 'expo-router';

import { getPostLoginRoute, useAuthContext } from '@/contexts/AuthContext';
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
      let role;
      try {
        role = await login(emailNormalizado, senha);
      } catch (err) {
        const recusado = err instanceof ApiError && err.status === 401;
        if (!recusado || emailDigitado === emailNormalizado) throw err;
        role = await login(emailDigitado, senha);
      }
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goToCadastro = () => router.push('/cadastro');

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
  };
}
