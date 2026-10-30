import { useState } from 'react';
import { useRouter } from 'expo-router';

import { getPostLoginRoute, useAuthContext } from '@/contexts/AuthContext';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';
import { primeiroRequisitoPendente } from '@/utils/senha';

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
  const [aceiteTermos, setAceiteTermos] = useState(false);
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

    const requisitoPendente = primeiroRequisitoPendente(senha);
    if (requisitoPendente) {
      setErro(requisitoPendente);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    if (!aceiteTermos) {
      setErro('É necessário aceitar a Política de Privacidade e os Termos de Uso');
      return;
    }

    if (papel === 'gestor' && !codigoAcesso.trim()) {
      setErro('Informe o código de acesso de gestor');
      return;
    }

    try {
      setRemembered(true);
      const resultado = await register({
        nome: nomeLimpo,
        email: emailLimpo,
        senha,
        papel,
        codigoAcesso: papel === 'gestor' ? codigoAcesso.trim() : undefined,
      });
      if (resultado.tipo === 'confirmar-email') {
        router.replace({ pathname: '/confirmar-email', params: { email: emailLimpo } });
      } else if (resultado.tipo === 'mfa') {
        router.push({ pathname: '/mfa', params: { desafio: resultado.desafio } });
      } else if (resultado.tipo === 'mfa-configuracao') {
        router.push({ pathname: '/mfa-configurar', params: { desafio: resultado.desafio } });
      } else {
        router.replace(getPostLoginRoute(resultado.role));
      }
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao criar conta');
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goToLogin = () => router.push('/login');
  const goToPrivacidade = () => router.push('/privacidade');
  const toggleAceiteTermos = () => setAceiteTermos((v) => !v);

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
    aceiteTermos,
    toggleAceiteTermos,
    goToPrivacidade,
    erro,
    isLoading,
    handleCadastro,
    goBack,
    goToLogin,
  };
}
