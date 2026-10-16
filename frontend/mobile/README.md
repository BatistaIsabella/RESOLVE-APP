# RESOLVE — App Mobile

Aplicativo mobile do **RESOLVE**, plataforma de demandas urbanas: o **cidadão** registra ocorrências (com foto e localização GPS) e o **gestor** acompanha e atualiza o andamento.

Feito com **React Native + Expo (SDK 57)**, **Expo Router**, **Context API** (`useState` + `useEffect`) e **axios**. O app é gerado **somente para Android e iOS** (sem versão web/PWA).

## Pré-requisitos

- Node.js 20+ e npm
- App **Expo Go** no celular (Android/iOS), ou um emulador/simulador (Android Studio / Xcode)
- API Gateway do RESOLVE acessível (veja [Configuração](#configuração))

## Instalação e execução

```bash
cd frontend/mobile
npm install
npm start          # abre o Metro; escaneie o QR Code com o Expo Go
```

Atalhos:

| Comando           | O que faz                                 |
| ----------------- | ----------------------------------------- |
| `npm start`       | Inicia o servidor de desenvolvimento      |
| `npm run android` | Inicia e abre no emulador/dispositivo Android |
| `npm run ios`     | Inicia e abre no simulador iOS (macOS)    |
| `npm run lint`    | Roda o ESLint                             |
| `npx tsc --noEmit`| Checagem de tipos                         |

### Expo Go x development build

- **Expo Go**: caminho mais rápido; funciona para câmera, galeria e GPS. As permissões do `app.json` só têm efeito pleno em builds nativos, mas o Expo Go pede as permissões em tempo de execução normalmente.
- **Development build** (build nativo com o app RESOLVE de verdade, identificador `br.com.resolve.app`):

  ```bash
  npx expo run:android      # ou: npx expo run:ios (macOS)
  # ou, na nuvem:
  eas build -p android --profile development
  ```

  Depois, rode `npm start` e abra o app instalado.

## Configuração

A URL do backend vem da variável `EXPO_PUBLIC_API_GATEWAY_URL` (lida em `lib/api.ts`). Se não for definida, o padrão é `https://smartcity-api.beholder.app.br`.

Para sobrescrever localmente:

```bash
cp .env.example .env
# edite o .env
```

Valores comuns:

- Gateway em produção: `https://smartcity-api.beholder.app.br`
- Gateway local + emulador Android: `http://10.0.2.2:8080`
- Gateway local + celular físico (mesma rede Wi‑Fi): `http://<IP-da-sua-máquina>:8080`

Reinicie o Metro (`npm start -c`) após mudar o `.env`. Nos builds EAS, a variável é definida por perfil em `eas.json`.

## Gerar o APK (Android)

O perfil `preview` gera um **APK** instalável diretamente no celular, apontando para o gateway de produção:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Ao final, o EAS devolve um link para baixar o `.apk`. Perfis disponíveis em `eas.json`:

| Perfil        | Uso                                                | API                                  |
| ------------- | -------------------------------------------------- | ------------------------------------ |
| `development` | Development build (`developmentClient`)            | `http://localhost:8080`              |
| `preview`     | APK de distribuição interna (testes/entrega)       | `https://smartcity-api.beholder.app.br` |
| `production`  | Build de loja (AAB no Android / IPA no iOS)        | `https://smartcity-api.beholder.app.br` |

Para iOS: `eas build -p ios --profile production` (requer conta Apple Developer).

## Permissões nativas

Configuradas em `app.json` (plugins), com textos em português:

- **Câmera** (`expo-camera`, `expo-image-picker`): fotografar o problema urbano.
- **Galeria** (`expo-image-picker`): anexar foto existente.
- **Localização em uso** (`expo-location`): registrar o ponto exato da ocorrência.

Microfone não é usado e fica desativado.

## Estrutura de pastas

```
frontend/mobile
├── app/             # Telas e rotas (Expo Router, baseado em arquivos)
├── components/      # Componentes reutilizáveis (AuthGuard, ui/, ui/charts/)
├── constants/       # Cores, enums e constantes de domínio
├── hooks/           # Hooks compartilhados (ex.: useAuth)
├── lib/             # Infra: cliente axios (api.ts) e armazenamento seguro
├── services/        # Chamadas à API (camada de dados)
├── contexts/        # Estado global (AuthContext e DemandContext)
├── viewmodels/      # ViewModels das telas (MVVM)
├── types/           # Tipos TypeScript
├── utils/           # Funções utilitárias
├── assets/          # Ícones, splash e imagens
├── app.json         # Configuração do Expo (nome, ids, plugins, permissões)
└── eas.json         # Perfis de build do EAS
```

## Mapa de rotas

| Rota                | Arquivo                    | Descrição                                   | Acesso   |
| ------------------- | -------------------------- | ------------------------------------------- | -------- |
| `/`                 | `app/index.tsx`            | Tela inicial ("Faça sua denúncia" / "Sou gestor") | Público |
| `/login`            | `app/login.tsx`            | Login                                       | Público  |
| `/cadastro`         | `app/cadastro.tsx`         | Cadastro de cidadão                         | Público  |
| `/denuncias`        | `app/denuncias/index.tsx`  | Lista das denúncias do cidadão              | Cidadão  |
| `/denuncias/nova`   | `app/denuncias/nova.tsx`   | Nova denúncia (foto + GPS)                  | Cidadão  |
| `/denuncias/[id]`   | `app/denuncias/[id].tsx`   | Detalhe da denúncia                         | Cidadão  |
| `/gestor`           | `app/gestor/index.tsx`     | Painel do gestor (lista, filtros, indicadores) | Gestor |
| `/gestor/[id]`      | `app/gestor/[id].tsx`      | Detalhe/atualização de uma demanda          | Gestor   |

As rotas de `denuncias/` e `gestor/` são protegidas por `components/AuthGuard.tsx` conforme o perfil do usuário.
