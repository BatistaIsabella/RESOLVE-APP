# RESOLVE — App Mobile

Aplicativo mobile do **RESOLVE**, plataforma de registro e acompanhamento de demandas urbanas. O **cidadão** registra ocorrências com foto e localização e acompanha o andamento; o **gestor público** consulta todas as demandas, atualiza status e prioridade e acompanha indicadores.

Feito com **React Native 0.86 + Expo SDK 57**, **Expo Router**, **TypeScript** e **Context API**. O app é gerado para **Android e iOS** (`app.json` declara `platforms: ["ios", "android"]`; não há versão web).

> Este documento descreve apenas o app em `frontend/mobile/`. Para a visão geral do projeto, veja o [README da raiz](../../README.md). Para subir o backend, veja o [README do backend](../../backend/README.md).

## Sumário

1. [Objetivo e funcionalidades](#1-objetivo-e-funcionalidades)
2. [Tecnologias](#2-tecnologias)
3. [Arquitetura e organização](#3-arquitetura-e-organização)
4. [Telas e mapa de rotas](#4-telas-e-mapa-de-rotas)
5. [Fluxo de navegação](#5-fluxo-de-navegação)
6. [Perfis de acesso](#6-perfis-de-acesso)
7. [Integração com o backend](#7-integração-com-o-backend)
8. [Gerenciamento de estado e persistência](#8-gerenciamento-de-estado-e-persistência)
9. [Recursos nativos e permissões](#9-recursos-nativos-e-permissões)
10. [Pré-requisitos](#10-pré-requisitos)
11. [Instalação e variáveis de ambiente](#11-instalação-e-variáveis-de-ambiente)
12. [Execução em desenvolvimento](#12-execução-em-desenvolvimento)
13. [Execução no Android](#13-execução-no-android)
14. [Builds com EAS e atualizações OTA](#14-builds-com-eas-e-atualizações-ota)
15. [Testes e qualidade](#15-testes-e-qualidade)
16. [Status das funcionalidades](#16-status-das-funcionalidades)

---

## 1. Objetivo e funcionalidades

O app leva ao celular o fluxo da plataforma web RESOLVE: registrar o problema no local (foto e GPS), acompanhar o status e, para o gestor, administrar as demandas.

**Cidadão**
- Cadastro e login (com opção "Mantenha-me conectado").
- Registro de denúncia em 4 passos: foto, categoria/problema/região, localização, descrição.
- Lista das próprias denúncias, com filtros e busca, e detalhe de cada uma.
- Edição e exclusão da própria denúncia enquanto o status for **Aberta**.
- Notificação push quando o gestor muda o status de uma denúncia sua.

**Gestor**
- Painel com indicadores (demanda total, tempo médio de atendimento) e gráficos por categoria, status, região e período.
- Lista de todas as demandas, com filtros.
- Detalhe da demanda com alteração de **status** e **prioridade** e exclusão.

**Comuns aos dois perfis**
- Recuperação de senha por código, confirmação de e-mail, perfil (editar dados, trocar senha, exportar dados, excluir conta), aceite de termos e política de privacidade (LGPD) e verificação em duas etapas (MFA).
- Modo offline de leitura: exibe os últimos dados salvos quando a API não responde.

---

## 2. Tecnologias

Versões conforme `package.json`.

| Área | Tecnologia |
|---|---|
| Base | React Native 0.86.3, React 19.2.3, Expo ~57.0, TypeScript ~6.0 |
| Navegação | `expo-router` (rotas baseadas em arquivos, `typedRoutes` ligado), `@react-navigation/*` |
| Estado | Context API (`AuthContext`, `DemandContext`) |
| HTTP | `axios` |
| Armazenamento | `expo-secure-store` (sessão), `@react-native-async-storage/async-storage` (cache da lista) |
| Câmera e mídia | `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` |
| Localização | `expo-location` |
| Notificações | `expo-notifications`, `expo-device`, `expo-constants` |
| Atualizações | `expo-updates` (EAS Update) |
| Gráficos | `react-native-svg` (componentes próprios em `components/ui/charts/`) |
| Interface | `expo-linear-gradient`, `expo-image`, `expo-haptics`, `@expo/vector-icons`, `react-native-reanimated` |
| Qualidade | ESLint (`eslint-config-expo`), testes com o runner nativo do Node |

Configurações relevantes em `app.json`: `newArchEnabled: true` e `experiments.reactCompiler: true`.

> O app **não usa Zustand**. Zustand existe apenas no frontend web (`frontend/`).

---

## 3. Arquitetura e organização

O app segue **MVVM**, descrito em detalhe em [`ARQUITETURA.md`](./ARQUITETURA.md):

- **View**: telas em `app/` e componentes em `components/`. Só montam o layout.
- **ViewModel**: um hook por tela em `viewmodels/`. Guarda o estado da tela, valida entradas, trata permissões e decide a navegação.
- **Model**: `contexts/`, `services/`, `lib/`, `utils/`, `types/`, `constants/`.

```
frontend/mobile
├── app/             # Telas e rotas (Expo Router). _layout.tsx é a raiz do app
│   ├── denuncias/   # Área do cidadão (protegida por AuthGuard requiredRole="cidadao")
│   └── gestor/      # Área do gestor (protegida por AuthGuard requiredRole="gestor")
├── components/      # AuthGuard e componentes de interface (ui/, ui/charts/)
├── constants/       # Cores, tema, categorias/regiões/status e textos dos termos
├── contexts/        # AuthContext (sessão) e DemandContext (demandas, métricas, cache)
├── hooks/           # useAuth, useNotificacoes, useOtaUpdate, use-color-scheme
├── lib/             # api.ts (axios), authToken.ts, secureStorage.ts, cacheStorage.ts, pushRegistration.ts
├── services/        # Uma função por endpoint: auth, conta, demandas, métricas, notificações
├── types/           # Tipos do domínio (Demand etc.)
├── utils/           # Mappers API↔app, filtros, agregações dos gráficos, imagem, senha, MFA, cache
│   └── __tests__/   # Testes unitários (.mjs)
├── viewmodels/      # useLoginViewModel, useNovaDenunciaViewModel, ... (13 hooks)
├── assets/images/   # Ícones, splash e imagem da tela inicial
├── app.json         # Nome, identificadores, plugins e permissões do Expo
├── eas.json         # Perfis de build (development, preview, production)
└── .env.example     # Modelo da variável de ambiente
```

**Ponto de entrada.** `package.json` define `"main": "expo-router/entry"`. A raiz real é `app/_layout.tsx`, que:
1. envolve o app em `AuthProvider` e, dentro dele, `DemandProvider`;
2. monta `useNotificacoes()` (push) e `useOtaUpdate()` (atualizações) por meio de componentes que não desenham nada;
3. declara um `Stack` com todas as rotas, sem cabeçalho nativo.

O alias `@/` aponta para a raiz do projeto (`tsconfig.json`).

---

## 4. Telas e mapa de rotas

| Rota | Arquivo | Descrição | Acesso |
|---|---|---|---|
| `/` | `app/index.tsx` | Tela inicial. Se já há sessão, redireciona direto para a área do perfil | Público |
| `/login` | `app/login.tsx` | Login com opção "Mantenha-me conectado" | Público |
| `/cadastro` | `app/cadastro.tsx` | Cadastro como cidadão ou gestor (gestor exige código de acesso), senha forte e aceite dos termos | Público |
| `/confirmar-email` | `app/confirmar-email.tsx` | Confirmação do e-mail por código | Público |
| `/esqueci-senha` | `app/esqueci-senha.tsx` | Pede o código de redefinição por e-mail | Público |
| `/redefinir-senha` | `app/redefinir-senha.tsx` | Define a nova senha com o código recebido | Público |
| `/privacidade` | `app/privacidade.tsx` | Política de Privacidade e Termos de Uso | Público |
| `/mfa` | `app/mfa.tsx` | Código do autenticador durante o login | Público (exige desafio do login) |
| `/mfa-configurar` | `app/mfa-configurar.tsx` | Ativação da verificação em duas etapas | Durante o login ou logado |
| `/aceite-termos` | `app/aceite-termos.tsx` | Aceite da versão vigente dos termos | Logado |
| `/perfil` | `app/perfil.tsx` | Editar dados, trocar senha, exportar dados, excluir conta, ativar/desativar MFA | Logado |
| `/denuncias` | `app/denuncias/index.tsx` | Lista das denúncias do cidadão | Cidadão |
| `/denuncias/nova` | `app/denuncias/nova.tsx` | Nova denúncia (foto + GPS) | Cidadão |
| `/denuncias/[id]` | `app/denuncias/[id].tsx` | Detalhe da denúncia | Cidadão |
| `/denuncias/editar/[id]` | `app/denuncias/editar/[id].tsx` | Edição (só com status Aberta) | Cidadão |
| `/gestor` | `app/gestor/index.tsx` | Painel: indicadores, gráficos, filtros e lista | Gestor |
| `/gestor/[id]` | `app/gestor/[id].tsx` | Alterar status e prioridade, excluir | Gestor |

---

## 5. Fluxo de navegação

```
        ┌──────────────┐
        │  /  (início) │── sessão restaurada? ──► /denuncias (cidadão) ou /gestor (gestor)
        └──────┬───────┘
               │ os dois botões levam a /login
               ▼
          ┌─────────┐   cadastro   ┌───────────┐
          │ /login  │◄────────────►│ /cadastro │
          └────┬────┘              └─────┬─────┘
               │                         │ e-mail por confirmar
               │ senha correta           ▼
               │ ┌─────────────────► /confirmar-email
               │ │
               ├─┴─ exige MFA ─────────► /mfa            ─┐
               ├─── exige configurar ──► /mfa-configurar ─┤ (conclui o login)
               │                                          │
               ▼                                          ▼
        getPostLoginRoute(papel)  ◄───────────────────────┘
        ├─ cidadão ► /denuncias ─► /denuncias/nova | /denuncias/[id] ─► /denuncias/editar/[id]
        └─ gestor  ► /gestor    ─► /gestor/[id]
```

Pontos importantes, todos no código:

- **Os dois botões da tela inicial** ("Faça sua denúncia" e "Sou gestor") chamam `router.push('/login')`. Há **uma única tela de login**; o perfil vem da resposta do servidor, não do botão escolhido.
- O destino pós-login é decidido por `getPostLoginRoute(role)` em `contexts/AuthContext.tsx`: `'gestor'` vai para `/gestor`; qualquer outro vai para `/denuncias`.
- Se a conta tem e-mail não confirmado, o login responde com o código `EMAIL_NAO_CONFIRMADO` e `useLoginViewModel` leva a `/confirmar-email`.

---

## 6. Perfis de acesso

A diferenciação entre cidadão e gestor acontece em três camadas:

1. **Servidor.** `/auth/login` devolve `papel` (`cidadao` ou `gestor`). No cadastro, o papel gestor exige `codigoAcesso`, validado pelo auth-service.
2. **Sessão no app.** `AuthContext` guarda `role` junto com token, nome, e-mail, órgão e `termosPendentes`.
3. **Guarda de rotas.** `components/AuthGuard.tsx` envolve `app/denuncias/_layout.tsx` (`requiredRole="cidadao"`) e `app/gestor/_layout.tsx` (`requiredRole="gestor"`). Ordem de decisão:
   - sem token, redireciona para `/`;
   - com termos pendentes, redireciona para `/aceite-termos`;
   - com perfil diferente do exigido, redireciona para a área correta do perfil.

   Enquanto a sessão salva é restaurada, mostra `LoadingScreen` ("Restaurando sessão...").

O controle **definitivo** de permissão está no backend: as rotas de `/demands/gestor/*` usam `roleMiddleware('gestor')` e as de cidadão usam `roleMiddleware('cidadao')`. O guarda do app melhora a experiência, mas não substitui a validação do servidor.

---

## 7. Integração com o backend

O app fala **somente com o API Gateway** (porta 8080 em desenvolvimento), que encaminha para `auth-service`, `demand-service` e `metrics-service`.

**Cliente HTTP (`lib/api.ts`)**
- `baseURL` vem de `EXPO_PUBLIC_API_GATEWAY_URL`; se ausente, usa `https://smartcity-api.beholder.app.br`.
- Timeout de 30 s.
- Interceptor de requisição: adiciona `Authorization: Bearer <token>` quando há sessão.
- Interceptor de resposta: converte erros em `ApiError` (com `status` e `codigo`), traduz mensagens para o usuário e, em **401 fora das rotas de autenticação**, chama `notifyUnauthorized()`, que encerra a sessão localmente.

**Endpoints usados** (conforme `services/`)

| Serviço no app | Chamadas |
|---|---|
| `authService` | `POST /auth/login`, `/auth/login/mfa`, `/auth/register`, `/auth/logout`, `/auth/confirmar-email`, `/auth/reenviar-confirmacao`, `/auth/forgot-password`, `/auth/reset-password` |
| `contaService` | `GET/PATCH /auth/me`, `POST /auth/me/senha`, `POST /auth/aceite-termos`, `DELETE /auth/me`, `POST /auth/mfa/configurar`, `/auth/mfa/ativar`, `/auth/mfa/desativar`, `GET /demands/me/export` |
| `demandService` | `GET /demands/my-demands`, `GET /demands/gestor`, `GET /demands/:id`, `GET /demands/gestor/:id`, `POST /demands`, `PATCH /demands/:id`, `DELETE /demands/:id`, `DELETE /demands/gestor/:id`, `PATCH /demands/gestor/:id/status`, `PATCH /demands/gestor/:id/prioridade` |
| `metricsService` | `GET /metrics` |
| `notificacaoService` | `POST /demands/devices`, `DELETE /demands/devices` |

O gateway reescreve `/demands` para `/demandas` ao encaminhar ao `demand-service`; o app só conhece o nome público `/demands`.

**Tradução entre API e app.** `utils/demandMapper.ts` e `utils/metricsMapper.ts` convertem os nomes e enums da API para os tipos do app (`types/demand.ts`) e vice-versa.

**Tratamento de erros.** Mensagens amigáveis por status (400, 401, 403, 404, 409, 429, 502, 500), tratamento específico de timeout ("Tempo de conexão esgotado") e de ausência de resposta ("Servidor indisponível"). Erros de política de senha chegam como lista em `detalhes` e são exibidos linha a linha.

---

## 8. Gerenciamento de estado e persistência

**`contexts/AuthContext.tsx`**: token, papel, nome, e-mail, órgão, `termosPendentes`, `hasHydrated`. Expõe `login`, `register`, `concluirLoginMfa`, `logout`, `aceitarTermos`, `atualizarSessao`. Ao abrir o app, restaura a sessão do SecureStore; a cada mudança, grava ou apaga. O `logout` avisa o servidor (`/auth/logout`), remove o aparelho das notificações e limpa o estado local.

**`contexts/DemandContext.tsx`**: lista de demandas, filtros, métricas, estados de carregamento e de erro por área (`loadingList`, `loadingMetrics`, `loadingDetail`, `saving`) e as ações `fetchDemands`, `fetchMetrics`, `fetchDemandById`, `createDemand`, `updateDemand`, `updateDemandStatus`, `updateDemandPriority`, `deleteDemand`, `setFilters`. Quando o token muda (login/logout), todo o estado é zerado. É consumido com `useDemandContext((s) => s.campo)`.

**Persistência**

| O quê | Onde | Regra |
|---|---|---|
| Sessão (token, papel, nome, e-mail, órgão, termos) | `expo-secure-store` (`lib/secureStorage.ts`, chave `resolve-mobile-auth`) | Só é gravada com "Mantenha-me conectado" marcado |
| Cache da última lista e métricas | AsyncStorage (`lib/cacheStorage.ts`, chave `resolve-mobile-demandas`) | Mesma regra; apagado no logout e na sessão expirada |

**Modo offline.** Quando a busca falha por falta de rede, as telas mostram a cópia salva e o `OfflineBanner` ("Sem conexão — exibindo dados salvos em ..."). Só a lista **sem filtro** vai para o cache; offline, os filtros são aplicados localmente sobre ela. Erro de servidor continua aparecendo como erro. É um modo de **leitura**: o app não enfileira escritas feitas sem rede.

---

## 9. Recursos nativos e permissões

Declarados em `app.json`:

- **Android (`permissions`)**: `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
- **Textos de permissão** (plugins `expo-camera`, `expo-image-picker`, `expo-location`), em português. Microfone fica desativado.

| Recurso | Onde | Como funciona |
|---|---|---|
| **Câmera** | `useNovaDenunciaViewModel` | `useCameraPermissions()` pede permissão; `CameraView.takePictureAsync({ quality: 0.7 })` |
| **Galeria** | `useNovaDenunciaViewModel` | `ImagePicker.requestMediaLibraryPermissionsAsync()` e `launchImageLibraryAsync` |
| **Localização** | `useNovaDenunciaViewModel` | Permissão em uso; GPS com limite de 10 s; geocodificação reversa com limite de 5 s; se falhar, mostra coordenadas ou pede o endereço digitado |
| **Permissão negada** | `utils/permissionAlert.ts` | Alerta com botão "Abrir Ajustes" (`Linking.openSettings()`) |
| **Imagem** | `utils/imageUtils.ts` | Reprocessa a foto: lado maior até 1280 px, JPEG qualidade 0.6. Isso também remove os metadados EXIF (podem conter localização). Se o reprocessamento falhar, a foto **não** é enviada |
| **Push** | `lib/pushRegistration.ts`, `hooks/useNotificacoes.ts` | Veja a seção 14 |

A foto é enviada em **base64** dentro do JSON da denúncia (`demandService.create`), com barra de progresso do envio.

---

## 10. Pré-requisitos

- **Node.js 22 ou superior** e npm. O script `npm test` usa `--experimental-strip-types`, que exige Node 22.6+. (O `flake.nix` da raiz também usa Node 22.)
- Um destes para executar o app: emulador Android (Android Studio), simulador iOS (Xcode, só macOS) ou aparelho físico.
- **Backend rodando** e acessível (veja o [README do backend](../../backend/README.md)), ou use o gateway publicado configurado como padrão.
- Para builds na nuvem: conta Expo e `eas-cli`.

---

## 11. Instalação e variáveis de ambiente

```bash
cd frontend/mobile
npm install
cp .env.example .env     # no Windows: copy .env.example .env
```

**Única variável usada pelo app** (verificada em `lib/api.ts`, `eas.json` e `.env.example`):

| Variável | Função | Exemplo |
|---|---|---|
| `EXPO_PUBLIC_API_GATEWAY_URL` | URL do API Gateway, **sem barra no final** | `http://10.0.2.2:8080` |

Valores conforme o ambiente:

| Cenário | Valor |
|---|---|
| Emulador Android com backend local | `http://10.0.2.2:8080` |
| Celular físico na mesma rede | `http://<IP-da-sua-máquina>:8080` |
| Gateway publicado | `https://smartcity-api.beholder.app.br` (padrão se a variável não existir) |

As variáveis `EXPO_PUBLIC_*` são embutidas no código na hora do bundle; reinicie o Metro (`npx expo start -c`) depois de alterá-las.

---

## 12. Execução em desenvolvimento

```bash
npm start            # Metro; abre o menu do Expo
```

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento (`expo start`) |
| `npm run android` | Inicia e abre no Android (`expo start --android`) |
| `npm run ios` | Inicia e abre no iOS (`expo start --ios`, macOS) |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Testes unitários dos utilitários |
| `npx tsc --noEmit` | Checagem de tipos |

Para o backend local, siga o [README do backend](../../backend/README.md) (Docker Compose na pasta `backend/`; o gateway responde em `http://localhost:8080`).

**Expo Go x development build.** O Expo Go serve para testar telas rapidamente, mas **não** exercita recursos que dependem de build nativo: notificações push remotas e atualizações OTA (`useOtaUpdate` fica desligado no Expo Go e no `expo start`, conforme comentário em `hooks/useOtaUpdate.ts`). Para o comportamento completo, use um development build.

---

## 13. Execução no Android

**Emulador (Android Studio)**
1. Crie e inicie um AVD.
2. Em `.env`, defina `EXPO_PUBLIC_API_GATEWAY_URL=http://10.0.2.2:8080` (o emulador enxerga a máquina host por `10.0.2.2`).
3. `npm run android`.

**Aparelho físico**
1. Aparelho e computador na mesma rede; use o IP da máquina na variável.
2. `npm start` e abra o app instalado (development build) ou o Expo Go.

**Development build local** (identificador do app: `br.com.resolve.app`):

```bash
npx expo run:android
```

---

## 14. Builds com EAS e atualizações OTA

`eas.json` define três perfis:

| Perfil | Distribuição | Gateway embutido | Observação |
|---|---|---|---|
| `development` | interna, `developmentClient: true` | `http://localhost:8080` | Canal `development` |
| `preview` | interna, **APK** no Android | `https://smartcity-api.beholder.app.br` | Canal `preview` |
| `production` | loja, `autoIncrement` | `https://smartcity-api.beholder.app.br` | Canal `production` |

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # APK de teste
eas build -p android --profile production   # build de loja
```

O `app.json` já contém `extra.eas.projectId` e `updates.url`, ou seja, o projeto está vinculado a uma conta/projeto Expo (`owner: icarusss`). **Se você for gerar builds com outra conta, esse vínculo precisa ser refeito** (`eas init`). O perfil `development` aponta para `localhost`, que não funciona em aparelho físico; ajuste conforme a seção 11. A seção `submit.production` está vazia: o envio às lojas não está configurado.

**Atualizações OTA (EAS Update).** `runtimeVersion` usa a política `appVersion`. Mudanças só de JavaScript chegam sem novo build: `eas update --channel preview` (ou `production`). `hooks/useOtaUpdate.ts` verifica ao voltar para o primeiro plano, baixa a atualização e pergunta antes de reiniciar o app.

**Notificações push.**
1. Ao entrar como **cidadão** (sessão ativa e termos aceitos), `useNotificacoes` pede permissão e registra o token Expo em `POST /demands/devices`. Ao sair, remove o token (`DELETE /demands/devices`).
2. Quando o gestor muda o status, o `demand-service` envia o aviso; tocar nele abre `/denuncias/<id>` (`utils/notificacaoRota.ts`).
3. Só funciona em **aparelho físico** (o código ignora emuladores com `Device.isDevice`). Sem `extra.eas.projectId`, o app apenas registra um aviso no log.
4. O backend aceita registro de aparelho somente de contas de **cidadão**; o gestor não recebe push.
5. O código cria o canal Android `status-denuncia`. A configuração de credenciais de envio no Android (Firebase/FCM) fica fora deste repositório e não foi verificada.

---

## 15. Testes e qualidade

```bash
npm test
```

Executa 8 arquivos em `utils/__tests__/`: `extractBairro`, `senha`, `mfa`, `listParams`, `tempoMedio`, `notificacaoRota`, `demandCache`, `dataSincronizacao`.

**Última verificação deste README:** `npm test` executado com Node 22, **38 testes, 38 aprovados, 0 falhas**.

Observações:
- Os testes cobrem **funções puras de `utils/`**. Não há testes de telas, ViewModels ou contexts.
- O pipeline de CI (`.github/workflows/regressao.yml`) executa apenas 3 dos 8 arquivos (`extractBairro`, `senha`, `mfa`).
- Os testes E2E da pasta `e2e/` usam Playwright contra o frontend web (`http://localhost:3000`); não há testes automatizados do app nativo.

---

## 16. Status das funcionalidades

Legenda: **Implementada**: o código existe e está ligado às rotas e aos serviços. **Validada**: coberta por teste executado. Nenhuma funcionalidade abaixo foi validada em execução no aparelho como parte da elaboração deste documento; a coluna "Validação" indica só o que tem teste automatizado.

| Funcionalidade | Status | Arquivos principais | Validação |
|---|---|---|---|
| Estrutura Expo Router, layouts e rotas | Implementada | `app/_layout.tsx`, `app/*/_layout.tsx` | — |
| Login, cadastro e sessão | Implementada | `login.tsx`, `cadastro.tsx`, `AuthContext.tsx`, `authService.ts` | Regras de senha: `senha.test.mjs` |
| Sessão persistente e segura | Implementada | `lib/secureStorage.ts` | — |
| Diferenciação cidadão/gestor e guarda de rotas | Implementada | `AuthGuard.tsx`, `getPostLoginRoute` | — |
| Área do cidadão: listar, detalhar, criar, editar, excluir | Implementada | `app/denuncias/*`, `demandService.ts` | Parâmetros de lista: `listParams.test.mjs` |
| Área do gestor: lista, filtros, status, prioridade, exclusão | Implementada | `app/gestor/*`, `demandService.ts` | — |
| Painel de indicadores e gráficos | Implementada | `useGestorDashboardViewModel.ts`, `components/ui/charts/` | Tempo médio: `tempoMedio.test.mjs` |
| Câmera e galeria | Implementada | `useNovaDenunciaViewModel.ts`, `imageUtils.ts` | — |
| Localização (GPS + endereço) | Implementada | `useNovaDenunciaViewModel.ts` | Extração de bairro: `extractBairro.test.mjs` |
| MFA (verificação em duas etapas) | Implementada | `mfa.tsx`, `mfa-configurar.tsx`, `useMfaViewModel.ts` | `mfa.test.mjs` |
| Recuperação de senha e confirmação de e-mail | Implementada | `esqueci-senha.tsx`, `redefinir-senha.tsx`, `confirmar-email.tsx` | — |
| Perfil, exportação e exclusão de conta, termos e privacidade | Implementada | `perfil.tsx`, `contaService.ts`, `privacidade.tsx`, `aceite-termos.tsx` | — |
| Notificações push | Implementada (depende de aparelho físico, projectId e credenciais) | `pushRegistration.ts`, `useNotificacoes.ts` | Rota do aviso: `notificacaoRota.test.mjs` |
| Modo offline (leitura) | Implementada | `DemandContext.tsx`, `cacheStorage.ts`, `OfflineBanner.tsx` | `demandCache.test.mjs`, `dataSincronizacao.test.mjs` |
| Atualização OTA | Implementada (só em build nativo) | `useOtaUpdate.ts`, `eas.json` | — |
| Build Android (APK) | Configurada em `eas.json` | `eas.json`, `app.json` | - |

---



## Documentos relacionados

- [`ARQUITETURA.md`](./ARQUITETURA.md): detalhes do MVVM, ViewModels e regras para código novo.
- [README da raiz](../../README.md): visão geral do projeto e da API.
- [README do backend](../../backend/README.md): como subir os microsserviços.
