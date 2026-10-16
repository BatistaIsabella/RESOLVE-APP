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

    // O autocompletar do teclado costuma deixar um espaço no fim do e-mail.
    const emailLimpo = email.trim();
    if (!emailLimpo || !senha) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setRemembered(manterConectado);
      const role = await login(emailLimpo, senha);
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    }
  };

  const goBack = () => router.back();
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
