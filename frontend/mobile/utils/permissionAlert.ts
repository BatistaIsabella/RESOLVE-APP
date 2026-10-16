import { Alert, Linking } from 'react-native';

/**
 * Alerta de permissão negada com atalho para os Ajustes do sistema. Depois de
 * negar (ou marcar "não perguntar de novo"), o app não consegue pedir de novo:
 * só o usuário liberando nos Ajustes.
 */
export function alertPermissaoNegada(titulo: string, mensagem: string) {
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
  ]);
}
