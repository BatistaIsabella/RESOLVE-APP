import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  console.log('ESTOU NO INDEX DA SMART CITY');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ImageBackground
        source={require('../../assets/images/cidade.png')}
        style={styles.background}
        resizeMode="cover"
      >

        <LinearGradient
          colors={[
            'rgba(101, 35, 220, 0.78)',
            'rgba(137, 35, 220, 0.72)',
            'rgba(255, 75, 92, 0.70)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Conteúdo da tela */}
        <View style={styles.content}>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Smart City
            </Text>

            <Text style={styles.subtitle}>
              Sua cidade{'\n'}em suas mãos
            </Text>
          </View>

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.denunciaButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                console.log('Faça sua denúncia');
              }}
            >
              <Text style={styles.buttonText}>
                Faça sua denúncia
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.gestorButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                console.log('Sou gestor');
              }}
            >
              <Text style={styles.buttonText}>
                Sou gestor
              </Text>
            </Pressable>

          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * Container principal
   */
  container: {
    flex: 1,
    backgroundColor: '#7B2BEF',
  },

  /*
   * Imagem de fundo
   */
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

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