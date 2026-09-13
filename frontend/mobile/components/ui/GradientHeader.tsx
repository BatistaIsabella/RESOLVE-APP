import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/colors';

interface GradientHeaderProps {
  title: string;
  profileLabel?: string;
  variant?: 'default' | 'gestor';
  onBack?: () => void;
  onLogout?: () => void;
}

export function GradientHeader({
  title,
  profileLabel = 'Usuário',
  variant = 'default',
  onBack,
  onLogout,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors =
    variant === 'gestor'
      ? [AppColors.gestorGradientStart, AppColors.gestorGradientEnd, '#FFFFFF']
      : [AppColors.gradientStart, AppColors.gradientMid, AppColors.gradientEnd, '#FFFFFF'];

  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.gradient, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.nav}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.navText}>Voltar</Text>
        </Pressable>
        <Text style={styles.navText}>{profileLabel}</Text>
        <Pressable onPress={onLogout} hitSlop={12}>
          <Text style={styles.navText}>Sair</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{title}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navText: {
    color: AppColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: AppColors.white,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
});
