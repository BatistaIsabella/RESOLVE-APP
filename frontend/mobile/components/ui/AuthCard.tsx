import React from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

interface AuthCardProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

// Mesmo visual das telas de login e cadastro: fundo da cidade, degradê e card branco.
export function AuthCard({ title, onBack, children }: AuthCardProps) {
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

        <Pressable style={styles.voltar} onPress={onBack}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {children}
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: '#374151', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C9B8F0',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  helperText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  link: { color: '#7B2BEF', fontWeight: '700' },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  successText: { color: '#15803D', fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: '#8628FF',
    borderRadius: 30,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7B2BEF' },
  background: { flex: 1, width: '100%', height: '100%' },
  voltar: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  voltarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: { color: '#3D2683', fontSize: 26, fontWeight: '800', textAlign: 'center' },
});
