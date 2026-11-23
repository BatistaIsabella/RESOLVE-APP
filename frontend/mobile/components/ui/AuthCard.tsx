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
    <View className="flex-1 bg-primary-dark">
      <StatusBar style="light" />

      <ImageBackground
        source={require('../../assets/images/cidade.png')}
        className="h-full w-full flex-1"
        resizeMode="cover"
      >
        {/* LinearGradient é componente de terceiros: segue com style */}
        <LinearGradient
          colors={['rgba(101, 35, 220, 0.78)', 'rgba(137, 35, 220, 0.72)', 'rgba(255, 75, 92, 0.70)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <Pressable className="absolute left-6 top-[60px] z-10" onPress={onBack}>
          <Text className="text-base font-semibold text-white">Voltar</Text>
        </Pressable>

        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-[100px]"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-4 rounded-3xl bg-white px-6 py-8 shadow-2xl">
            <Text className="text-center text-[26px] font-extrabold text-ink">{title}</Text>
            {children}
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

// Mantido para as telas que ainda usam StyleSheet. Vá trocando por className aos poucos.
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