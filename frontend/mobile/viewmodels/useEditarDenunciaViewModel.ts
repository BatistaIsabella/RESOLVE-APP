import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { Demand, DemandCategory, DemandRegion, DemandUpdateInput } from '@/types/demand';
import { ApiError } from '@/lib/api';

export const TITULO_MAX = 50;

type CampoEditavel = keyof DemandUpdateInput;

const VALOR_ATUAL: Record<CampoEditavel, (d: Demand) => string> = {
  titulo: (d) => d.titulo,
  descricao: (d) => d.description,
  categoria: (d) => d.category,
  regiao: (d) => d.region,
  endereco: (d) => d.endereco,
};

const CAMPOS = Object.keys(VALOR_ATUAL) as CampoEditavel[];

export type ErrosEdicao = Partial<Record<CampoEditavel, string>>;

function validar(valores: Record<CampoEditavel, string>): ErrosEdicao {
  const erros: ErrosEdicao = {};
  if (!valores.titulo.trim()) erros.titulo = 'Informe um título.';
  else if (valores.titulo.trim().length > TITULO_MAX) {
    erros.titulo = `O título pode ter no máximo ${TITULO_MAX} caracteres.`;
  }
  if (!valores.descricao.trim()) erros.descricao = 'Descreva o problema.';
  if (!valores.categoria) erros.categoria = 'Escolha uma categoria.';
  if (!valores.regiao) erros.regiao = 'Escolha uma região.';
  if (!valores.endereco.trim()) erros.endereco = 'Informe o endereço.';
  return erros;
}

/**
 * ViewModel da tela "Editar denúncia" (app/denuncias/editar/[id].tsx): o
 * cidadão altera título, descrição, categoria, região e endereço enquanto a
 * denúncia está Aberta. Só os campos alterados vão para a API.
 */
export function useEditarDenunciaViewModel(id: string | undefined) {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const updateDemand = useDemandStore((s) => s.updateDemand);
  const isLoading = useDemandStore((s) => s.loadingDetail);
  const demand = useDemandStore((s) => s.demands.find((d) => d.id === id) ?? null);

  // Guarda só o que o usuário mudou; o resto é lido da denúncia carregada.
  // Assim o formulário não precisa ser "inicializado" quando a denúncia chega.
  const [alteracoes, setAlteracoes] = useState<Partial<Record<CampoEditavel, string>>>({});
  const [erros, setErros] = useState<ErrosEdicao>({});
  const [erroEnvio, setErroEnvio] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Chega aqui direto do detalhe, então quase sempre já está no store.
  const precisaCarregar = !!id && !demand;
  useEffect(() => {
    if (precisaCarregar && id) fetchDemandById(id);
  }, [precisaCarregar, id, fetchDemandById]);

  const valor = (campo: CampoEditavel): string =>
    alteracoes[campo] ?? (demand ? VALOR_ATUAL[campo](demand) : '');

  const valores = Object.fromEntries(CAMPOS.map((c) => [c, valor(c)])) as Record<
    CampoEditavel,
    string
  >;

  const alterar = (campo: CampoEditavel) => (texto: string) => {
    setAlteracoes((prev) => ({ ...prev, [campo]: texto }));
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: undefined }));
  };

  const podeEditar = demand?.status === 'Aberta';

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.replace(id ? `/denuncias/${id}` : '/denuncias');
  };

  const salvar = async () => {
    if (!demand || !id || salvando) return;

    const novosErros = validar(valores);
    setErros(novosErros);
    setErroEnvio('');
    if (Object.keys(novosErros).length > 0) return;

    const input: DemandUpdateInput = {};
    for (const campo of CAMPOS) {
      const novo = campo === 'categoria' || campo === 'regiao' ? valores[campo] : valores[campo].trim();
      if (novo === VALOR_ATUAL[campo](demand)) continue;
      if (campo === 'categoria') input.categoria = novo as DemandCategory;
      else if (campo === 'regiao') input.regiao = novo as DemandRegion;
      else input[campo] = novo;
    }

    if (Object.keys(input).length === 0) {
      voltar();
      return;
    }

    setSalvando(true);
    try {
      await updateDemand(id, input);
      // No react-native-web o Alert ignora os botões (o onPress nunca rodaria).
      if (Platform.OS === 'web') {
        voltar();
        return;
      }
      Alert.alert('Denúncia atualizada', 'As alterações foram salvas.', [
        { text: 'OK', onPress: voltar },
      ]);
    } catch (err) {
      setErroEnvio(err instanceof ApiError ? err.message : 'Erro ao salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const sair = () => {
    logout();
    router.replace('/');
  };

  return {
    userName,
    demand,
    carregando: isLoading && !demand,
    podeEditar,
    valores,
    erros,
    erroEnvio,
    salvando,
    alterarTitulo: alterar('titulo'),
    alterarDescricao: alterar('descricao'),
    alterarCategoria: alterar('categoria'),
    alterarRegiao: alterar('regiao'),
    alterarEndereco: alterar('endereco'),
    salvar,
    voltar,
    sair,
  };
}
