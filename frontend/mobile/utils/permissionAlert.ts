import { Alert, Linking } from 'react-native';

export function alertPermissaoNegada(titulo: string, mensagem: string) {
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
  ]);
}
