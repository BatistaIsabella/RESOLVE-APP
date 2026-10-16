import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Href, useRouter } from 'expo-router';

import { useDemandStore } from '@/stores/useDemandStore';
import { ApiError } from '@/lib/api';

/**
 * Exclusão com confirmação, usada pelos detalhes do cidadão e do gestor. A
 * store tira a denúncia da lista, então ao voltar a lista já está atualizada.
 *
 * @param voltarPara rota usada quando não há tela anterior na pilha.
 */
export function useExcluirDenuncia(id: string | undefined, voltarPara: Href) {
  const router = useRouter();
  const deleteDemand = useDemandStore((s) => s.deleteDemand);
  const [excluindo, setExcluindo] = useState(false);
  // Depois de excluir, a denúncia some do store antes da navegação terminar;
  // a tela usa isto para não piscar "não encontrada" nesse intervalo.
  const [excluida, setExcluida] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const excluir = async () => {
    if (!id) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await deleteDemand(id);
      setExcluida(true);
      if (router.canGoBack()) router.back();
      else router.replace(voltarPara);
    } catch (err) {
      setErroExclusao(err instanceof ApiError ? err.message : 'Erro ao excluir a denúncia.');
    } finally {
      setExcluindo(false);
    }
  };

  const confirmarExclusao = () => {
    if (!id || excluindo) return;
    // No react-native-web o Alert ignora os botões.
    if (Platform.OS === 'web') {
      if (window.confirm('Excluir esta denúncia? Esta ação não pode ser desfeita.')) excluir();
      return;
    }
    Alert.alert(
      'Excluir denúncia',
      'Esta ação não pode ser desfeita. Deseja excluir a denúncia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluir },
      ]
    );
  };

  return { confirmarExclusao, excluindo, excluida, erroExclusao };
}
