import { useState } from 'react';
import { useRouter } from 'expo-router';

import { getPostLoginRoute, useAuthContext } from '@/contexts/AuthContext';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';

export type Papel = 'cidadao' | 'gestor';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useCadastroViewModel() {
  const router = useRouter();
  const register = useAuthContext().register;
  const isLoading = useAuthContext().isLoading;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [papel, setPapel] = useState<Papel>('cidadao');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [erro, setErro] = useState('');

  const selecionarPapel = (novo: Papel) => {
    setPapel(novo);
    if (novo === 'cidadao') setCodigoAcesso('');
  };

  const handleCadastro = async () => {
    setErro('');

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo || !emailLimpo || !senha || !confirmarSenha) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }

    if (!EMAIL_REGEX.test(emailLimpo)) {
      setErro('Digite um e-mail válido');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    if (papel === 'gestor' && !codigoAcesso.trim()) {
      setErro('Informe o código de acesso de gestor');
      return;
    }

    try {
      setRemembered(true);
      const role = await register(
        nomeLimpo,
        emailLimpo,
        senha,
        papel,
        papel === 'gestor' ? codigoAcesso.trim() : undefined
      );
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao criar conta');
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goToLogin = () => router.push('/login');

  return {
    nome,
    setNome,
    email,
    setEmail,
    senha,
    setSenha,
    confirmarSenha,
    setConfirmarSenha,
    papel,
    selecionarPapel,
    codigoAcesso,
    setCodigoAcesso,
    erro,
    isLoading,
    handleCadastro,
    goBack,
    goToLogin,
  };
}
