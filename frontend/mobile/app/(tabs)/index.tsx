import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  console.log('ESTOU NO INDEX DA SMART CITY');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.background}>

        <Image
          source={require('../../assets/images/cidade.png')}
          style={styles.cityImage}
          resizeMode="cover"
        />

        <LinearGradient
          colors={[
            'rgba(101, 35, 220, 0.06)',
            'rgba(255, 0, 255, 0.02)',
            'rgba(255, 89, 0, 0.22)',
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />

        <View style={styles.content}>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Smart City
            </Text>

            <Text style={styles.subtitle}>
              Sua cidade{'\n'}em suas mãos
            </Text>
          </View>

          <View style={styles.buttonsContainer}>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.denunciaButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/login')}
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
              onPress={() => router.push('/denuncias')}
            >
              <Text style={styles.buttonText}>
                Sou gestor
              </Text>
            </Pressable>

          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B2BEF',
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },

  cityImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },

  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 200,
    paddingBottom: 200,
  },

  textContainer: {
    alignItems: 'flex-start',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: '800',
    lineHeight: 45,

    textShadowColor: 'rgba(0, 0, 0, 0.25)',

    textShadowOffset: {
      width: 2,
      height: 2,
    },

    textShadowRadius: 4,
  },

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

  buttonsContainer: {
    gap: 28,
  },

  button: {
    width: '100%',
    height: 58,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  denunciaButton: {
    backgroundColor: '#FF5757',
  },

  gestorButton: {
    backgroundColor: '#8628FF',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.8,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});