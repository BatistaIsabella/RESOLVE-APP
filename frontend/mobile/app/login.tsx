import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLoginViewModel } from '@/viewmodels/useLoginViewModel';

export default function LoginScreen() {
  const vm = useLoginViewModel();

  return (
    <View className="flex-1 bg-primary-dark">
      <StatusBar style="light" />

      <ImageBackground
        source={require('../assets/images/cidade.png')}
        className="h-full w-full flex-1"
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
          style={StyleSheet.absoluteFill}
        />

        <Pressable className="absolute left-6 top-[60px] z-10" onPress={vm.goBack}>
          <Text className="text-base font-semibold text-white">Voltar</Text>
        </Pressable>

        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-[100px]"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-5 rounded-3xl bg-white px-6 py-8 shadow-2xl">
            <Text className="text-center text-[26px] font-extrabold text-ink">Smart City</Text>

            <View className="gap-3">
              <Pressable
                className="h-[50px] items-center justify-center rounded-[10px] bg-ink active:opacity-80 active:scale-[0.98]"
                disabled
              >
                <Text className="text-[15px] font-semibold text-white">
                  Entrar com Certificado Digital
                </Text>
              </Pressable>

              <Pressable
                className="h-[50px] items-center justify-center rounded-[10px] bg-ink active:opacity-80 active:scale-[0.98]"
                disabled
              >
                <Text className="text-[15px] font-semibold text-white">Entrar com gov.br</Text>
              </Pressable>
            </View>

            <Text className="text-center text-[13px] text-gray-500">
              Faça login em sua conta. Ou{' '}
              <Text className="font-bold text-primary-dark" onPress={vm.goToCadastro}>
                Cadastrar-se
              </Text>
            </Text>

            {vm.erro ? (
              <Text className="text-center text-[13px] text-red-600">{vm.erro}</Text>
            ) : null}

            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-gray-700">Email</Text>
              <TextInput
                className="h-12 rounded-[10px] border-[1.5px] border-lilac bg-white px-3.5 text-[15px] text-gray-800"
                placeholder="seu@email.com"
                placeholderTextColor="#9B8AC4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={vm.email}
                onChangeText={vm.setEmail}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-gray-700">Senha</Text>
              <TextInput
                className="h-12 rounded-[10px] border-[1.5px] border-lilac bg-white px-3.5 text-[15px] text-gray-800"
                placeholder="••••••••"
                placeholderTextColor="#9B8AC4"
                secureTextEntry
                value={vm.senha}
                onChangeText={vm.setSenha}
              />
            </View>

            <Pressable
              className="flex-row items-center gap-2.5"
              onPress={vm.toggleManterConectado}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                  vm.manterConectado
                    ? 'border-primary-dark bg-primary-dark'
                    : 'border-violet-muted'
                }`}
              >
                {vm.manterConectado && (
                  <Text className="text-[13px] font-bold text-white">✓</Text>
                )}
              </View>
              <Text className="text-[13px] text-gray-700">Mantenha-me conectado</Text>
            </Pressable>

            <Text className="text-center text-[13px] text-gray-500">
              <Text className="font-bold text-primary-dark" onPress={vm.goToEsqueciSenha}>
                Esqueci minha senha
              </Text>
            </Text>

            <Pressable
              className={`h-[54px] items-center justify-center rounded-full bg-primary active:opacity-80 active:scale-[0.98] ${
                vm.isLoading ? 'opacity-60' : ''
              }`}
              onPress={vm.handleLogin}
              disabled={vm.isLoading}
            >
              <Text className="text-base font-bold text-white">
                {vm.isLoading ? 'ENTRANDO...' : 'ENTRAR'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}