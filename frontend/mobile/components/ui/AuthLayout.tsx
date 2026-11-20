import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CityBackground } from '@/components/ui/CityBackground';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Moldura do login e do cadastro: fundo da cidade, "Voltar" e o card branco. */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  const router = useRouter();

  return (
    <CityBackground>
      <Pressable
        style={styles.voltar}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
      >
        <Text style={styles.voltarText}>Voltar</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CityBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  voltar: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  voltarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  title: {
    color: '#3D2683',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
});
