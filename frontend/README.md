<h1 align="center">
  🏙️ Plataforma de Registro Eletrônico de Solicitações e Ocorrências com Verificação e Encaminhamento (RESOLVE)
</h1>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
</p>

<p align="center">
  Uma aplicação web para centralizar o registro de demandas urbanas, facilitar o acompanhamento das solicitações e oferecer mais visibilidade para os gestores.
</p>

---

## 🌍 Visão Geral

A plataforma busca melhorar a comunicação entre o cidadão e a gestão responsável, reduzindo a dispersão de informações e apoiando a tomada de decisão com dados operacionais em tempo real.

### 🎯 O Problema Central
A ausência de uma plataforma centralizada para registro, rastreabilidade e priorização de demandas urbanas dificulta a tomada de decisão por parte da gestão responsável e reduz a eficiência no atendimento à população.

### 🏛️ Alinhamento com Políticas Públicas
A proposta dialoga com as diretrizes de transformação digital no setor público, em especial a **Lei nº 14.129/2021 (Lei do Governo Digital)**, estabelecendo princípios como:
- Eficiência administrativa e desburocratização;
- Transparência;
- Uso de soluções digitais para melhorar os serviços públicos.

Relaciona-se também com a **Estratégia Nacional de Governo Digital**, incentivando o uso de tecnologias para melhorar a relação entre o governo e o cidadão.

---

## ✅ Objetivos Específicos
- **Centralizar** o registro de demandas urbanas.
- **Permitir** o acompanhamento claro das solicitações.
- **Oferecer** visibilidade operacional para gestores públicos.
- **Aumentar** a transparência no atendimento à população.
- **Organizar** o fluxo de demandas com base na prioridade, data e status.

---

## 👥 Perfis de Usuário

### 🧑‍💼 Cidadão
Responsável por:
- [x] Registrar demandas urbanas.
- [x] Visualizar a lista de demandas.
- [x] Consultar detalhes das solicitações.
- [x] Acompanhar o status das solicitações.

### 🏢 Gestor Público
Responsável por:
- [x] Visualizar demandas registradas de forma global.
- [x] Filtrar solicitações e atualizar o status manualmente.
- [x] Acessar o painel administrativo (Dashboard).
- [x] Acompanhar indicadores operacionais cruciais.

---

## 🚀 Funcionalidades do MVP

- [x] Cadastro e autenticação de usuários;
- [x] Criação e listagem de demandas urbanas;
- [x] Visualização detalhada de cada demanda;
- [x] Sistema de filtros avançados (categoria, região, prioridade e status);
- [x] Atualização manual de status (exclusivo para gestores);
- [x] Painel administrativo para gestores (Métricas e KPIs);
- [x] Integração com a API REST real (gateway), sem dados mockados;
- [x] Estado global em dois stores Zustand: `useAuthStore` (sessão/JWT) e `useDemandStore` (demandas);
- [x] Rotas privadas protegidas por `AuthGuard`; o cidadão edita e exclui a própria denúncia enquanto ela está aberta.

---

## 📊 Indicadores Operacionais (Gestão)
O painel administrativo acompanha, no mínimo:
1. **Volume:** Quantidade total de demandas registradas;
2. **Eficiência:** Tempo médio de atendimento;
3. **Distribuição:** Demandas por categoria;
4. **Geografia:** Demandas por região.

---

## 🖥️ Telas do Projeto

### 🥇 Prioridade Alta
| Tela | Descrição |
|---|---|
| **Página Inicial (Cidadão)** | Destaque para o fluxo do cidadão, listagem de demandas, sistema de filtros e acesso à área do gestor. |
| **Página Inicial (Gestor)** | Listagem geral, filtros avançados, acesso ao painel administrativo e ações de edição/atualização de status. |
| **Formulário de Demanda** | Coleta de dados da ocorrência (local, descrição, categoria, canal, etc.). |
| **Detalhes da Demanda** | Visualização completa de todos os dados de um registro específico. |
| **Painel Administrativo** | Dashboard focado em métricas operacionais para os gestores. |
| **Sistema de Filtros** | Combinação de filtros por tipo, região, status, data, canal e prioridade. |

### 🥈 Prioridade Secundária
| Tela | Descrição |
|---|---|
| **Login e Cadastro** | Acesso segmentado (`Sou cidadão` ou `Sou gestor`) com email e senha. |

---

## ⚙️ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Front-end** | `TypeScript`, `Next.js`, `Chakra UI`, `Tailwind CSS`, `Zustand` |
| **Back-end & Integração** | `Node.js`, `Express`, `Prisma ORM` |
| **Autenticação & Dados** | `JWT`, `Cookies`, `Redis`, `Cron Jobs` |

---

## 🏗️ Arquitetura Front-end

A proposta prioriza uma estrutura simples, escalável e de fácil manutenção, com separação clara de responsabilidades.

<details>
<summary><b>📂 Estrutura de Pastas (Clique para expandir)</b></summary>

```text
src/
  app/
    (gestor)/
    (public)/
      cadastro/
        page.tsx
      demandas/
        [id]/
          page.tsx
        nova/
          page.tsx
      login/
        page.tsx
        provider.tsx
      logingestor/
        page.tsx
        provider.tsx
      telaUsuario/
        page.tsx
      page.tsx
    globals.css
    icon.tsx
    layout.tsx
    page.tsx
  components/
    Auth/
      page.tsx
    demands/
      FormDemanda.tsx
    UI/
      BackgroundContainer.tsx
      Button.tsx
      DemandBadge.tsx
      DemandCard.tsx
      DemandDetails.tsx
      DemandFilters.tsx
      Logo.tsx
      PriorityBadge.tsx
      provider.tsx
      Select.tsx
      StatusBadge.tsx
  constants/
    demanda.ts
  lib/
    api.ts
    authToken.ts
  Services/
    authService.ts
    demandService.ts
    metricsService.ts
  stores/
    useAuthStore.ts
    useDemandStore.ts
  types/
    demand.ts
  utils/
    demandMapper.ts

```

</details>

👩‍💻 Equipe de Desenvolvimento

- Beatriz Paredes
- Cecília Medeiros
- Isabella Batista
- Jose Leandro De Morais Alves Luz
- Gabriel Souza
