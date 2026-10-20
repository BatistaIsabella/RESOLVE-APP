import { useCallback, useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { Conta, contaService } from '@/services/contaService';
import { primeiroRequisitoPendente } from '@/utils/senha';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mensagemDe(err: unknown, padrao: string) {
  return err instanceof ApiError ? err.message : padrao;
}

// Tela "Meus dados": consulta, correção, troca de senha, exportação e exclusão da conta.
export function usePerfilViewModel() {
  const router = useRouter();
  const { logout, atualizarSessao } = useAuth();

  const [conta, setConta] = useState<Conta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [mensagemDados, setMensagemDados] = useState('');
  const [erroDados, setErroDados] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState('');

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const aplicarConta = useCallback((dados: Conta) => {
    setConta(dados);
    setNome(dados.nome);
    setEmail(dados.email);
  }, []);

  useEffect(() => {
    let ativo = true;
    contaService
      .obter()
      .then((dados) => ativo && aplicarConta(dados))
      .catch((err) => ativo && setErroCarga(mensagemDe(err, 'Não foi possível carregar seus dados')))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [aplicarConta]);

  const salvarDados = async () => {
    setErroDados('');
    setMensagemDados('');

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    if (!nomeLimpo) return setErroDados('Informe o nome');
    if (!EMAIL_REGEX.test(emailLimpo)) return setErroDados('Digite um e-mail válido');
    if (conta && nomeLimpo === conta.nome && emailLimpo === conta.email) {
      return setErroDados('Nenhum dado foi alterado');
    }

    try {
      setSalvandoDados(true);
      const resposta = await contaService.atualizar({ nome: nomeLimpo, email: emailLimpo });
      aplicarConta(resposta.conta);
      atualizarSessao({ token: resposta.token, userName: resposta.conta.nome, userEmail: resposta.conta.email });
      setMensagemDados('Dados atualizados');
    } catch (err) {
      setErroDados(mensagemDe(err, 'Não foi possível atualizar os dados'));
    } finally {
      setSalvandoDados(false);
    }
  };

  const alterarSenha = async () => {
    setErroSenha('');
    setMensagemSenha('');

    if (!senhaAtual) return setErroSenha('Informe a senha atual');
    const pendente = primeiroRequisitoPendente(novaSenha);
    if (pendente) return setErroSenha(pendente);
    if (novaSenha !== confirmarSenha) return setErroSenha('As senhas não coincidem');

    try {
      setSalvandoSenha(true);
      const resposta = await contaService.alterarSenha(senhaAtual, novaSenha);
      atualizarSessao({ token: resposta.token });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMensagemSenha('Senha alterada. Os outros aparelhos foram desconectados.');
    } catch (err) {
      setErroSenha(mensagemDe(err, 'Não foi possível alterar a senha'));
    } finally {
      setSalvandoSenha(false);
    }
  };

  // Abre a folha de compartilhamento do sistema com o JSON da cópia dos dados.
  const exportarDados = async () => {
    setErroExportacao('');
    try {
      setExportando(true);
      const dados = await contaService.exportarDados();
      await Share.share({ title: 'Meus dados - RESOLVE', message: JSON.stringify(dados, null, 2) });
    } catch (err) {
      setErroExportacao(mensagemDe(err, 'Não foi possível exportar os dados'));
    } finally {
      setExportando(false);
    }
  };

  const pedirExclusao = () => {
    Alert.alert(
      'Excluir conta',
      'Seu e-mail e suas fotos serão apagados e as ocorrências deixarão de ter ligação com você. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: () => setConfirmandoExclusao(true) },
      ]
    );
  };

  const confirmarExclusao = async () => {
    setErroExclusao('');
    if (!senhaExclusao) return setErroExclusao('Informe a sua senha para confirmar');

    try {
      setExcluindo(true);
      await contaService.excluir(senhaExclusao);
      logout();
      router.replace('/');
    } catch (err) {
      setErroExclusao(mensagemDe(err, 'Não foi possível excluir a conta'));
    } finally {
      setExcluindo(false);
    }
  };

  return {
    conta,
    carregando,
    erroCarga,
    nome,
    setNome,
    email,
    setEmail,
    salvandoDados,
    mensagemDados,
    erroDados,
    salvarDados,
    senhaAtual,
    setSenhaAtual,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    salvandoSenha,
    mensagemSenha,
    erroSenha,
    alterarSenha,
    exportando,
    erroExportacao,
    exportarDados,
    confirmandoExclusao,
    senhaExclusao,
    setSenhaExclusao,
    excluindo,
    erroExclusao,
    pedirExclusao,
    confirmarExclusao,
    cancelarExclusao: () => {
      setConfirmandoExclusao(false);
      setSenhaExclusao('');
      setErroExclusao('');
    },
    abrirPrivacidade: () => router.push('/privacidade'),
    sair: () => {
      logout();
      router.replace('/');
    },
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/')),
  };
}
