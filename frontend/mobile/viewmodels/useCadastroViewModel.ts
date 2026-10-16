import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuthStore, getPostLoginRoute } from '@/stores/useAuthStore';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';

export type Papel = 'cidadao' | 'gestor';

// Validação simples de formato, só pra dar um feedback consistente com o
// resto do app em vez de depender do popup nativo do navegador (que só
// aparece rodando em web, não no Expo Go).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ViewModel da tela de cadastro (app/cadastro.tsx). */
export function useCadastroViewModel() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

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

  // Aberta por deep link ou depois do logout, a tela não tem para onde voltar.
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
