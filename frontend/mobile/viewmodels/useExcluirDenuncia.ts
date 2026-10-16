import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Href, useRouter } from 'expo-router';

import { useDemandContext } from '@/contexts/DemandContext';
import { ApiError } from '@/lib/api';

export function useExcluirDenuncia(id: string | undefined, voltarPara: Href) {
  const router = useRouter();
  const deleteDemand = useDemandContext((s) => s.deleteDemand);
  const [excluindo, setExcluindo] = useState(false);
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
