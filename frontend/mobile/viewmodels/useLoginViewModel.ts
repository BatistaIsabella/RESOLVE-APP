import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuthStore, getPostLoginRoute } from '@/stores/useAuthStore';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';

/** ViewModel da tela de login (app/login.tsx). */
export function useLoginViewModel() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [erro, setErro] = useState('');

  const toggleManterConectado = () => setManterConectado((v) => !v);

  const handleLogin = async () => {
    setErro('');

    // O autocompletar do teclado costuma deixar espaço no fim e maiúscula no
    // início.
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
        // O backend compara o e-mail exatamente e contas antigas (cadastradas
        // pela web ou antes da normalização) podem ter maiúsculas gravadas.
        const recusado = err instanceof ApiError && err.status === 401;
        if (!recusado || emailDigitado === emailNormalizado) throw err;
        role = await login(emailDigitado, senha);
      }
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    }
  };

  // Aberta por deep link ou depois do logout, a tela não tem para onde voltar.
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
