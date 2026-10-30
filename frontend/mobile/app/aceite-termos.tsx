import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { getPostLoginRoute } from '@/contexts/AuthContext';
import { VERSAO_TERMOS } from '@/constants/termos';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Aparece para quem ainda não aceitou a versão vigente da política e dos termos
// (contas criadas antes do aceite existir, ou depois de uma nova versão).
export default function AceiteTermosScreen() {
  const router = useRouter();
  const { role, termosPendentes, hasHydrated, aceitarTermos, logout } = useAuth();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Quem já aceitou (ou abriu a tela sem sessão) não tem o que fazer aqui.
  useEffect(() => {
    if (hasHydrated && !termosPendentes) {
      router.replace(role ? getPostLoginRoute(role) : '/');
    }
  }, [hasHydrated, termosPendentes, role, router]);

  if (!hasHydrated || !termosPendentes) return null;

  const aceitar = async () => {
    setErro('');
    try {
      setEnviando(true);
      await aceitarTermos();
      router.replace(role ? getPostLoginRoute(role) : '/');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível registrar o aceite');
    } finally {
      setEnviando(false);
    }
  };

  const recusar = () => {
    logout();
    router.replace('/');
  };

  return (
    <AuthCard title="Privacidade e termos" onBack={recusar}>
      <Text style={s.helperText}>
        Para continuar usando o RESOLVE, leia e aceite a Política de Privacidade e os Termos de Uso (versão{' '}
        {VERSAO_TERMOS}).
      </Text>

      <Text style={s.helperText}>
        <Text style={s.link} onPress={() => router.push('/privacidade')}>
          Ler a Política de Privacidade e os Termos de Uso
        </Text>
      </Text>

      {erro ? <Text style={s.errorText}>{erro}</Text> : null}

      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed, enviando && s.buttonDisabled]}
        onPress={aceitar}
        disabled={enviando}
      >
        <Text style={s.buttonText}>{enviando ? 'SALVANDO...' : 'Li e aceito'}</Text>
      </Pressable>

      <Text style={s.helperText}>
        Não concorda?{' '}
        <Text style={s.link} onPress={recusar}>
          Sair
        </Text>
      </Text>
    </AuthCard>
  );
}
