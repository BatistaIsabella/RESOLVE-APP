<h1 align="center">
  🏙️ RESOLVE - Plataforma de Registro Eletrônico de Solicitações e Ocorrências com Verificação e Encaminhamento de Demandas Urbanas
</h1>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
</p>

<p align="center">
  O RESOLVE Mobile é a extensão nativa/híbrida da plataforma RESOLVE, desenvolvida para aproximar o cidadão da gestão pública através de dispositivos móveis. A aplicação permite a abertura rápida de ocorrências com uso de recursos do smartphone (Câmera, GPS) e o acompanhamento em tempo real das demandas da cidade.
</p>

---

## 🌍 Visão Geral

A aplicação mobile simplifica o ciclo de vida de uma ocorrência urbana. O cidadão pode reportar um problema diretamente do local onde ele se encontra em poucos toques, enquanto gestores e equipes de campo podem visualizar, triar e atualizar o status das solicitações em tempo real.

### 🎯 O Problema Central
A burocracia e a falta de acessibilidade em canais tradicionais dificultam o reporte imediato de problemas urbanos (como buracos na via, falta de iluminação ou acúmulo de lixo). A versão mobile resolve o gap de proximidade, permitindo a captura imediata do contexto (foto e geolocalização precisa).

### 🏛️ Alinhamento com Políticas Públicas
O RESOLVE Mobile está em total conformidade com a Lei nº 14.129/2021 (Lei do Governo Digital) e a Estratégia Nacional de Governo Digital, promovendo:
- Inclusão digital: Acesso simples a serviços públicos na palma da mão.
- Eficiência e agilidade: Captura de dados estruturados (latitude, longitude, fotos) na origem da demanda.
- Transparência e acompanhamento: Notificações push sobre a evolução do chamado.

Relaciona-se também com a **Estratégia Nacional de Governo Digital**, incentivando o uso de tecnologias para melhorar a relação entre o governo e o cidadão.

---

## ✅ Objetivos Específicos
- **Centralizar** o registro de demandas urbanas.
- **Permitir** o acompanhamento claro das solicitações.
- **Oferecer** visibilidade operacional para os gestores.
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
- [x] Acessar o painel administrativo (painéis).
- [x] Acompanhar indicadores operacionais cruciais.

---

## 🚀 Funcionalidades do MVP

- [x] Cadastro e autenticação de usuários;
- [x] Criação e listagem de demandas urbanas;
- [x] Visualização detalhada de cada demanda;
- [x] Sistema de filtros avançados (prioridade, categoria, região  e status);
- [x] Atualização manual de status (exclusivo para gestores);
- [x] Visualizações em formato de Lista;
- [x] Painel administrativo para gestores (Métricas e KPIs);
- [x] Integração com API para simulação de dados.

---

## 📊 Indicadores Operacionais (Gestão)
O painel administrativo acompanha, no mínimo:
1. **Volume:** Quantidade total de demandas registradas;
2. **Distribuição:** Demandas por categoria;
3. **Geografia:** Demandas por região.

---

## 🖥️ Telas do Projeto

### 🥇 Prioridade Alta

| Tela | Descrição |
| :--- | :--- |
| **Feed / Home** | Lista de ocorrências com suporte a pull-to-refresh. |
| **Novo Registro (Câmera + GPS)** | Fluxo em passos simples: Foto $\rightarrow$ Categoria $\rightarrow$ Localização (GPS) $\rightarrow$ Descrição. |
| **Detalhes da Demanda** | Exibição de histórico, foto em alta resolução, localização no mapa e status atual. |
| **Mapa Operacional** | Visualização geográfica de demandas com marcadores categorizados. |

### 🥈 Prioridade Secundária

| Tela | Descrição |
| :--- | :--- |
| **Autenticação (Login/Cadastro)** | Acesso com login social ou credenciais nativas com suporte a persistência segura. |
| **Perfil / Configurações** | Gerenciamento de dados da conta e preferências de notificação push. |
---

## ⚙️ Stack Tecnológica

### Mobile Frontend
- **Framework:** React Native / Expo (com TypeScript) ou Flutter
- **Gerenciamento de Estado:** Zustand / Redux Toolkit
- **Estilização:** NativeWind (Tailwind CSS para React Native) ou Restyle
- **Recursos Nativos:** Expo Location (GPS), Expo Camera / ImagePicker, Expo Notifications (Push)
- **Consumo de API:** Axios / React Query (TanStack Query) com suporte a cache local

### Back-end & Infraestrutura
- **API Gateway:** Node.js / Express (Porta 8080)
- **Microsserviços:** Auth Service, Demand Service, Metrics Service
- **Banco de Dados & Cache:** PostgreSQL (Supabase/Prisma ORM) e Redis
---

#### 📡 Documentação da API
A plataforma RESOLVE utiliza um API Gateway como ponto central de entrada (Porta 8080), que gerencia o tráfego e a segurança entre o frontend e os microsserviços internos.

* **Endpoint Base:** `http://localhost:8080`
* **Formato de Payload:** Todas as trocas de dados são realizadas via JSON.

| Serviço | Método | Endpoint | Descrição |
| :--- | :--- | :--- | :--- |
| **Monitoramento** | `GET` | `/health` | Verifica a saúde e disponibilidade dos serviços. |
| **Autenticação** | `POST` | `/auth/login` | Autentica o usuário e gera o token de acesso (JWT). |
| **Demandas** | `GET` | `/demands` | Lista todas as demandas (com suporte a filtros avançados). |
| **Demandas** | `POST` | `/demands` | Registra uma nova ocorrência urbana no sistema. |
| **Métricas** | `GET` | `/metrics` | Retorna KPIs e indicadores operacionais para o gestor. |

---

## 🏛️ Arquitetura, Desempenho e Resiliência Mobile

- **Cache First & Offline Tolerance:** Uso do **React Query** com suporte a persistência no **AsyncStorage**, permitindo visualização de demandas mesmo em conexões instáveis.
- **Otimização de Upload de Imagens:** Compressão automática da imagem no dispositivo client-side antes do envio para a API, reduzindo o tráfego de dados móveis (3G/4G/5G).
- **Consumo Eficiente de Bateria e GPS:** Consulta à geolocalização nativa ativada apenas na abertura do formulário de criação de demanda.
- **Comunicação por Eventos & Filas:** Atualizações de status acionam eventos no Redis que disparam notificações push em background para os dispositivos dos cidadãos.
---

## 🔗 Links Úteis

| Ferramenta Utilizada | Material | Links |
| :--- | :--- | :---
| **Figma** | Protótipo | [Acesse aqui](https://www.figma.com/design/5qGAuNGrMKdG7AgXjG77YX/Smart-City?node-id=0-1&t=ew4wGee8wgaJ4qCo-1) |
| **Postman** | Documentação Pública da API | [Acesse aqui](https://documenter.getpostman.com/view/40719566/2sBXwtrADd) |
| **BRmodelo** | Modelagem conceitual - Auth | [Acesse aqui](public/images/modeloConceitualAuth.png) |
| **BRmodelo** | Modelagem lógica - Auth | [Acesse aqui](public/images/modeloLogicoAuth.png) |
| **BRmodelo** | Modelagem conceitual - Demand | [Acesse aqui](public/images/ModeloConceitualDemand.png) |
| **BRmodelo** | Modelagem lógica - Demand | [Acesse aqui](public/images/ModeloLogicoDemandv2.png) |
| **LucidChart** | Desenho da Arquitetura em Microsserviços | [Acesse aqui](public/images/Arquitetura_microsservicos.png) |

---

## 🚀 Como Rodar

### Frontend
```bash
cd RESOLVE_APP
npm install
npm run dev
```
> Disponível em http://localhost:3000

### Backend e Banco de Dados
```bash
cd backend
copy .env.example .env.local
docker compose --env-file .env.local up -d --build

docker compose --env-file .env.local exec auth-service npx prisma generate
docker compose --env-file .env.local exec auth-service npx prisma migrate deploy

docker compose --env-file .env.local exec demand-service npx prisma generate
docker compose --env-file .env.local exec demand-service npx prisma migrate deploy
```
> Disponível em http://localhost:8080

---

## 👩‍💻 Equipe de Desenvolvimento

- Arthur Estevaum
- Álvaro Silva
- Beatriz Paredes
- Cecília Medeiros
- Icaro Silva
- Isabella Batista
- Jose Leandro De Morais
- Melissa Filgueiras
- Gabriel Souza
- Thays Barbosa
