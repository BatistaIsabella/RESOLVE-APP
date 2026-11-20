import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CityBackground } from '@/components/ui/CityBackground';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <CityBackground>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Smart City</Text>
          <Text style={styles.subtitle}>Sua cidade{'\n'}em suas mãos</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.denunciaButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Faça sua denúncia</Text>
          </Pressable>

          {/* /gestor sem sessão cai no login (AuthGuard), igual ao botão acima. */}
          <Pressable
            style={({ pressed }) => [styles.button, styles.gestorButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/gestor')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Sou gestor</Text>
          </Pressable>
        </View>
      </View>
    </CityBackground>
  );
}

const styles = StyleSheet.create({
  /*
   * Conteúdo sobre a imagem
   */
  content: {
    flex: 1,

    justifyContent: 'space-between',

    paddingHorizontal: 32,
    paddingTop: 115,
    paddingBottom: 158,
  },

  /*
   * Área dos textos
   */
  textContainer: {
    alignItems: 'flex-start',
  },

  /*
   * Smart City
   */
  title: {
    color: '#FFFFFF',

    fontSize: 38,
    fontWeight: '800',

    lineHeight: 45,

    textShadowColor: 'rgba(0, 0, 0, 0.25)',

    textShadowOffset: {
      width: 2,
      height: 2,
    },

    textShadowRadius: 4,
  },

  /*
   * Sua cidade em suas mãos
   */
  subtitle: {
    color: '#FFFFFF',

    fontSize: 30,
    fontWeight: '800',

    lineHeight: 31,

    marginTop: 8,

    textShadowColor: 'rgba(0, 0, 0, 0.25)',

    textShadowOffset: {
      width: 2,
      height: 2,
    },

    textShadowRadius: 4,
  },

  /*
   * Área dos botões
   */
  buttonsContainer: {
    gap: 28,
  },

  /*
   * Estilo geral dos botões
   */
  button: {
    width: '100%',
    height: 58,

    borderRadius: 32,

    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * Botão Faça sua denúncia
   */
  denunciaButton: {
    backgroundColor: '#FF5757',
  },

  /*
   * Botão Sou gestor
   */
  gestorButton: {
    backgroundColor: '#8628FF',
  },

  /*
   * Texto dos botões
   */
  buttonText: {
    color: '#FFFFFF',

    fontSize: 17,
    fontWeight: '700',
  },

  /*
   * Efeito ao pressionar
   */
  buttonPressed: {
    opacity: 0.8,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});