# Arquitetura do Projeto Smart City

## 📋 Visão Geral

Smart City é uma plataforma web desenvolvida em **Next.js 16.2.1** com **React 19** para registro e acompanhamento de demandas urbanas. O projeto utiliza **Tailwind CSS** para estilização e **Zustand** para gerenciamento de estado.

---

## 🏗️ Estrutura do Projeto

```
Smart-City/
├── src/
│   ├── app/                           # App Router do Next.js
│   │   ├── globals.css                # Estilos globais
│   │   ├── icon.tsx                   # Ícone da aplicação
│   │   ├── layout.tsx                 # Layout raiz
│   │   ├── (gestor)/                  # Rotas protegidas - Gestor
│   │   │   └── gestor/
│   │   │       ├── page.tsx           # Dashboard principal do gestor
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx       # Página de estatísticas
│   │   │       ├── demandas/
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx   # Detalhes de demanda
│   │   │       └── kanban/
│   │   │           └── page.tsx       # Quadro Kanban
│   │   └── (public)/                  # Rotas públicas
│   │       ├── page.tsx               # Página inicial
│   │       ├── login/
│   │       │   └── page.tsx           # Página de login
│   │       ├── cadastro/
│   │       │   └── page.tsx           # Página de cadastro
│   │       └── demandas/
│   │           ├── nova/
│   │           │   └── page.tsx       # Criar nova demanda
│   │           └── [id]/
│   │               └── page.tsx       # Detalhes da demanda (cidadão)
│   ├── components/
│   │   ├── Auth/
│   │   │   └── page.tsx               # Componentes de autenticação
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Componentes do dashboard
│   │   ├── demands/
│   │   │   ├── DemandBadge.tsx        # Badge de status da demanda
│   │   │   └── FormDemanda.tsx        # Formulário de demanda
│   │   ├── layout/
│   │   │   └── page.tsx               # Componentes de layout
│   │   └── UI/                        # Componentes reutilizáveis
│   │       ├── BackgroundContainer.tsx
│   │       ├── Button.tsx             # Componente Button customizado
│   │       ├── DemandBadge.tsx
│   │       ├── DemandCard.tsx         # Card de demanda
│   │       ├── DemandDetails.tsx      # Detalhes da demanda
│   │       ├── Logo.tsx               # Logo da aplicação
│   │       ├── page.tsx
│   │       └── Select.tsx             # Select customizado
│   ├── hooks/
│   │   └── page.tsx                   # Custom hooks
│   ├── lib/
│   │   └── page.tsx                   # Funções utilitárias
│   ├── services/
│   │   └── page.tsx                   # Serviços de API
│   ├── stores/
│   │   ├── page.tsx
│   │   ├── useAuthStore.ts            # Zustand store da sessão (token JWT, perfil, login/logout/cadastro)
│   │   └── useDemandStore.ts          # Zustand store das demandas (CRUD via API)
│   └── types/
│       └── demand.ts                  # Tipos TypeScript
├── public/
│   └── images/                        # Imagens estáticas
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
└── tailwind.config.ts
```

---

## 🎯 Tipos de Usuário

### 1. **Cidadão**
- Acesso: `/login` ou `/cadastro`
- Funcionalidades:
  - Criar nova demanda (`/demandas/nova`)
  - Visualizar detalhes da demanda (`/demandas/[id]`)
  - Acompanhar status em tempo real

### 2. **Gestor**
- Acesso: `/login` (com código de gestor)
- Funcionalidades:
  - Dashboard com estatísticas (`/gestor/dashboard`)
  - Visualizar todas as demandas (`/gestor/demandas/[id]`)
  - Quadro Kanban (`/gestor/kanban`)
  - Gerenciar status das demandas

---

## 🔄 Fluxo de Navegação

### Página Inicial (`/`)
- Hero section com informações sobre a plataforma
- Dois cards: "Para Cidadãos" e "Para Gestores"
- Links para `/login` e `/cadastro`

### Fluxo Cidadão
```
Inicial (/) → Cadastro (/cadastro) → Login (/login) → page principal(/puublic)-> Nova Demanda (/demandas/nova)
```

### Fluxo Gestor
```
Inicial (/) → Login (/login) →  page primcipal(/gestor) ->Dashboard (/gestor/dashboard) → Gerenciar Demandas
```

---

## 🚫 Modificações Realizadas

### Remoção de Navegação Entre Páginas

**Mudanças implementadas em:**

1. **`src/app/(public)/page.tsx`**
   - Remover imports: `Link` do `next/link`
   - Substituir `<Link>` por `<button>` desabilitados
   - Adicionar classes de opacidade e desabilitação

2. **`src/app/(public)/login/page.tsx`**
   - Remover imports: `useRouter` do `next/navigation` e `Link`
   - Remover `router.push()` após login bem-sucedido
   - Adicionar alerta: "Login desabilitado: navegação entre páginas foi removida"
   - Desabilitar botões de link para `/` e `/cadastro`

3. **`src/app/(public)/cadastro/page.tsx`**
   - Remover imports: `useRouter` do `next/navigation` e `Link`
   - Remover `router.push("/login")` após cadastro
   - Adicionar alerta: "Cadastro desabilitado: navegação entre páginas foi removida"
   - Desabilitar botões de link para `/` e `/login`

**Resultado:**
- Todos os botões de navegação possuem `disabled` e `opacity-60`
- Ao tentar enviar formulário, mostra alerta informando que navegação foi desabilitada
- Links diretos via URL ainda funcionam

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 16.2.1 | Framework React com SSR |
| React | 19.2.4 | Library de UI |
| TypeScript | Latest | Type safety |
| Tailwind CSS | 4 | Estilização |
| Chakra UI | 3.34.0 | Componentes UI |
| Zustand | 5.0.12 | Gerenciamento de estado |
| Framer Motion | 12.38.0 | Animações |
| ESLint | 9 | Linting |

---

## 📦 Dependências Principais

### Produção
```json
{
  "@chakra-ui/next-js": "^2.4.2",
  "@chakra-ui/react": "^3.34.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "framer-motion": "^12.38.0",
  "next": "16.2.1",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "zustand": "^5.0.12"
}
```

### Desenvolvimento
```json
{
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "caniuse-lite": "^1.0.30001785",
  "eslint": "^9",
  "eslint-config-next": "16.2.1",
  "tailwindcss": "^4"
}
```

---

## 🚀 Como Executar

### Instalação
```bash
npm install --legacy-peer-deps
```

### Desenvolvimento
```bash
npm run dev
```
Acesse: `http://localhost:3000`

### Build
```bash
npm run build
```

### Produção
```bash
npm start
```

### Linting
```bash
npm run lint
```

---

## 📄 Tipos TypeScript

### `src/types/demand.ts`
Define a interface para demandas urbanas:
```typescript
interface Demand {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: 'aberta' | 'em_progresso' | 'concluida'
  prioridade: 'baixa' | 'media' | 'alta'
  criador: string
  dataCriacao: Date
  dataAtualizacao: Date
}
```

---

## 🎨 Componentes UI

### Button (`src/components/UI/Button.tsx`)
Componente customizado com variantes:
- `variant`: `primary`, `secondary`, `outline`
- `size`: `sm`, `md`, `lg`
- `disabled`: boolean

### DemandCard (`src/components/UI/DemandCard.tsx`)
Exibe informações da demanda em formato card.

### DemandBadge (`src/components/UI/DemandBadge.tsx`)
Badge indicando status da demanda.

### Select (`src/components/UI/Select.tsx`)
Componente de seleção customizado.

---

## 🗂️ Zustand Store

### `src/stores/useDemandStore.ts`
Gerencia estado global de demandas:
- `demands`: array de demandas
- `addDemand()`: criar nova demanda
- `updateDemand()`: atualizar demanda
- `removeDemand()`: remover demanda
- `getDemandById()`: buscar demanda por ID

---

## 📝 Dados Mock

### `src/mocks/fake-data.ts`
Contém dados fake para desenvolvimento e testes sem dependência de API.

---

## 🔐 Estrutura de Autenticação

**Atualmente:**
- Login simulado no cliente
- Sem persistência real (localStorage/sessão)
- Validação básica de email e senha

**Próximas implementações:**
- Integração com API real
- JWT tokens
- Refresh tokens
- Proteção de rotas

---

## 📱 Responsividade

Todas as páginas utilizam **Tailwind CSS** com breakpoints responsivos:
- Mobile: `base` (< 640px)
- Tablet: `md` (768px)
- Desktop: `lg` (1024px), `xl` (1280px)

---

## 🎯 Estado Atual

- ✅ Estrutura base implementada
- ✅ Componentes UI reutilizáveis
- ✅ Páginas públicas e protegidas
- ✅ Remoção de navegação entre páginas
- 🔄 Integração com API (pendente)
- 🔄 Autenticação real (pendente)
- 🔄 Testes (pendente)

---

## 📞 Contato

Repositório: [GitHub - Smart-City](https://github.com/Cecimedeiros/Smart-City)

---

**Última atualização:** 04 de Abril de 2026
**Versão:** 0.1.0
