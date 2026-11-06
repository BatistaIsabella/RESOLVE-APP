# Relatório de Avaliação - Unidade 1 - Desenvolvimento Mobile

## Resumo do Projeto
O grupo G5 desenvolveu a plataforma **RESOLVE** (Smart City) para gestão de demandas urbanas, contando com um backend orientado a eventos baseado em microsserviços (API Gateway, Auth, Demand e Metrics com Node.js, Express, Prisma e Redis), uma aplicação web Next.js e um aplicativo mobile React Native construído com Expo SDK 57 em `frontend/mobile/`. O aplicativo mobile contempla os fluxos de cidadão (listagem, filtros, detalhes e criação de denúncia passo a passo) e gestor (dashboard com gráficos nativos em SVG, filtros e atualização de status e prioridade com atualização otimista e rollback), utilizando Expo Router, Zustand com persistência em `expo-secure-store`, `expo-location`, `expo-camera` e `expo-image-picker`.

## Membros
- Arthur Estevão Ramos de Lima
- Alvaro Antonio e Silva
- Beatriz Paredes do Nascimento
- Cecília Medeiros Souza
- Gabriel dos Santos Souza
- Icaro Leonardo Silva de Souza Costa
- Isabella Batista
- José Leandro de morais Alves luz
- Melissa Vitória Filgueiras Pereira
- Thays Barbosa Santos da Costa

## Tabela de Avaliação (Total: 4,0 pontos)

| Critério | Valor Máximo | Nota Atribuída | Observações |
| :--- | :---: | :---: | :--- |
| **Entrega 1 (08/09)** | | | |
| Inclusão do colaborador `mr-costaalencar` | 0,2 | 0,2 | |
| **Entrega 2 (15/09)** | | | |
| Aplicação em React Native/Expo (Android/iOS) | 0,4 | 0,4 | Aplicativo mobile presente em `frontend/mobile/`, construído com React Native e Expo SDK 57. |
| Arquitetura clara (MVVM ou MVC) | 0,3 | 0,3 | Estrutura bem dividida em camadas (`app/`, `components/`, `hooks/`, `services/`, `stores/`, `types/`, `utils/`, `lib/`), separando telas, estado/regras e chamadas de API. |
| Integração com o backend definido | 0,3 | 0,3 | Consumo da API via Axios (`lib/api.ts`) com interceptors de autenticação JWT e serviços dedicados (`authService`, `demandService`, `metricsService`) integrados ao API Gateway. |
| **Entrega 3 (22/09)** | | | |
| Implementação de CRUD das ocorrências | 0,4 | 0,4 | Funcionalidades de criação, listagem com filtros, visualização de detalhes (cidadão e gestor) e atualização de status e prioridade (gestor) implementadas e integradas. |
| Listagem com componentes nativos | 0,3 | 0,3 | Uso confirmado de `FlatList` com `RefreshControl` em `app/denuncias/index.tsx` e `app/gestor/index.tsx`, além de `SelectField.tsx`. |
| Uso de GPS (Expo Location) | 0,3 | 0,3 | Utiliza `expo-location` em `app/denuncias/nova.tsx` com geocodificação reversa (`reverseGeocodeAsync`) para preenchimento automático do endereço e coordenadas. |
| Uso de Câmera (Expo Camera/Image Picker) | 0,3 | 0,3 | Utiliza `expo-camera` (`CameraView`) para captura direta e `expo-image-picker` para galeria em `app/denuncias/nova.tsx`, com conversão para base64 via `expo-file-system`. |
| **Entrega 4 (29/09)** | | | |
| Navegação com Expo Router | 0,5 | 0,5 | Roteamento baseado em arquivos em `app/` com proteção de rotas por perfil (`cidadao` e `gestor`) através do componente `AuthGuard`. |
| Persistência/Estado (`useState`, `useEffect`)| 0,5 | 0,5 | Uso de hooks nativos (`useState`, `useEffect`, `useMemo`, `useCallback`) combinados com Zustand e persistência segura de sessão via `expo-secure-store`. |
| Relatório de Uso de IA | 0,5 | 0,0 | Falta relatório descrevendo os resultados da IA no desenvolvimento e como foi feita a avaliação humana sobre tais resultados (há apenas saídas brutas de casos de teste em `docs/testes/ia/`). |
| **TOTAL** | **4,0** | **3,5** | |

## Pontos Positivos
- Arquitetura mobile bem estruturada em `frontend/mobile/`, separando claramente componentes visuais, stores Zustand (`useAuthStore`, `useDemandStore`), mappers e camada de serviços HTTP.
- Implementação de atualização otimista com rollback automático no `useDemandStore` ao alterar status e prioridade da demanda no fluxo do gestor.
- Persistência segura do token JWT utilizando `expo-secure-store` adaptado ao middleware `persist` do Zustand (`lib/secureStorage.ts`), com controle de hidratação (`_hasHydrated`) no `AuthGuard`.
- Uso combinado de `expo-camera` (`CameraView`), `expo-image-picker` e `expo-location` (incluindo `reverseGeocodeAsync`) no fluxo passo a passo de nova denúncia.
- Painel do gestor no mobile com gráficos customizados em SVG (`PieChart`, `BarChart`, `LineChart`) integrados ao endpoint `/metrics`.

## Pontos de Melhoria
- Na tela inicial (`app/(tabs)/index.tsx`), o botão `"Sou gestor"` navega para `/denuncias` (`router.push('/denuncias')`), embora o `AuthGuard` redirecione posteriormente caso não esteja autenticado ou seja gestor; seria mais claro direcionar para `/login` ou `/gestor`.
- Atualizar o `README.md` de `frontend/mobile/` (que ainda contém o template padrão do `create-expo-app`) e o `README.md` principal com instruções específicas de configuração e execução do aplicativo mobile.
- Incluir relatório detalhado sobre o uso de IA durante o desenvolvimento, descrevendo as ferramentas utilizadas, os resultados obtidos e a avaliação humana crítica sobre tais resultados.
