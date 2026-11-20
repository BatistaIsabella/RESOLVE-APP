import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

/** Foto da cidade com o degradê da marca: fundo da tela inicial, do login e do cadastro. */
export function CityBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/images/cidade.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(101, 35, 220, 0.78)', 'rgba(137, 35, 220, 0.72)', 'rgba(255, 75, 92, 0.70)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </ImageBackground>
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
  },
});
