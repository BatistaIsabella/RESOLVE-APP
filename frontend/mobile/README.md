# Smart City — app mobile

App Expo (React Native + expo-router) do cidadão e do gestor.

```bash
npm install
npx expo start          # Expo Go / emulador
npm run lint
npx tsc --noEmit        # checagem de tipos
```

A API usada é a de `EXPO_PUBLIC_API_GATEWAY_URL` (padrão: o gateway publicado).

## Organização (MVVM)

| Camada | Pasta | O que mora lá |
| --- | --- | --- |
| **View** | `app/` | Rotas (file-based routing). Cada arquivo é uma tela: lê o ViewModel e desenha. Não transforma dado nem guarda cópia do estado do store. |
| | `components/ui/` | Componentes visuais reutilizáveis (`FormField`, `SelectField`, `ErrorState`, `OfflineBanner`, `AuthLayout`, gráficos…). |
| **ViewModel** | `stores/` | Estado global em Zustand: dados, carregamento e erro **por operação**, otimismo/rollback, cache offline. |
| | `hooks/` | Hooks que as telas usam para falar com os stores (`useAuth`, `useDemandDetail`) e o `useOtaUpdate`. |
| **Model** | `services/` | Chamadas HTTP. Só buscam e devolvem o tipo de domínio. |
| | `lib/` | Infra: cliente axios e tratamento de erro (`api.ts`), storages do Zustand (`secureStorage`, `cacheStorage`). |
| | `utils/` | Funções puras: mappers API ⇄ domínio, filtros, agregações dos gráficos, **validação de formulários**. |
| | `types/` | Tipos de domínio (`Demand`, `UserRole`…). Categoria, região e status são derivados das listas de `constants/demanda.ts`. |
| | `constants/` | Listas de domínio (categorias, regiões…) e cores. |

Regras que valem para código novo:

- **Erros da API** saem sempre como `ApiError` (`lib/api.ts`); a tela usa `getErrorMessage(err, fallback)`. `status === 0` significa sem rede/timeout.
- **Validação** fica em `utils/validation.ts` (puro); a tela só mostra a mensagem no campo. Os limites espelham o banco (ex.: e-mail ≤ 35).
- **Loading:** só a primeira carga ocupa a tela (`LoadingScreen`); com dados na tela, a atualização acontece por trás. Erro sem dados → `ErrorState` com "Tentar novamente".
- **Seletor por campo** no store: `useDemandStore((s) => s.x)`, nunca o store inteiro.

## Sessão e modo offline

- **Sessão** (token JWT): Zustand `persist` sobre `expo-secure-store` (Keychain/Keystore). Só é gravada com "Mantenha-me conectado".
- **Cache de demandas e métricas:** Zustand `persist` sobre AsyncStorage. Sem rede, as telas mostram o cache com o aviso "Sem conexão — exibindo dados salvos em…". O cache é apagado no logout ou na sessão expirada, e segue a mesma regra do "Mantenha-me conectado".

## Atualizações OTA (expo-updates)

Configurado em `app.json` (`runtimeVersion: fingerprint`) e `eas.json` (canais `development`, `preview`, `production`). Na abertura o app baixa atualizações em segundo plano e pergunta antes de reiniciar.

Primeira vez (com login na conta Expo do time):

```bash
npx eas-cli init               # grava o projectId no app.json
npx eas-cli update:configure   # grava a URL de updates
npx eas-cli build --profile preview --platform android
```

Depois, para publicar uma atualização só de JavaScript:

```bash
npm run update:preview      # ou update:production
```

O OTA não funciona no Expo Go nem no `expo start`, só em builds do EAS.
