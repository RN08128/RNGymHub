# ⚡ RNGymHub

Uma aplicação web moderna e intuitiva para gerenciamento de fichas de treino, acompanhamento de histórico de sessões e análise visual de evolução de cargas (PRs).

![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20|%20Fastify%20|%20PostgreSQL%20|%20JavaScript-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Conteúdo

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura e Banco de Dados](#-arquitetura-e-banco-de-dados)
- [Instalação e Configuração Local](#-instalação-e-configuração-local)
- [Executando a Aplicação](#-executando-a-aplicação)
- [Acesso Remoto para Treinos (Cloudflare Tunnel)](#-acesso-remoto-para-treinos-cloudflare-tunnel)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **RNGymHub** foi desenvolvido para resolver o acompanhamento e progressão de carga na musculação. Ele permite cadastrar fichas de treino, registrar séries com peso e repetições em tempo real e visualizar métricas consolidadas (duração, volume total, recordes/PRs) além de gráficos de evolução por exercício.

---

## ✨ Funcionalidades

- 🏋️ **Gestão de Treinos:** Criação e personalização de fichas de treino.
- ⏱️ **Registro de Sessão:** Início e encerramento de treinos com cronometragem de duração.
- 📈 **Gráfico de Evolução:** Gráficos dinâmicos de progressão de carga máxima (1RM / Carga Pico) alimentados por `Chart.js`.
- 🏆 **Detecção Automática de PR:** Identificação de Recordes Pessoais por peso (`is_pr_weight`) e volume (`is_pr_volume`).
- 📊 **Histórico Detalhado (Modal/Drawer):** Visualização de estatísticas consolidadas por sessão (Volume em kg, PRs batidos, duração e séries por exercício).
- 📱 **Interface Responsiva:** Design otimizado para dispositivos móveis para facilitar o uso durante o treino na academia.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** & **TypeScript**
- **Fastify** (Framework HTTP rápido e de alto desempenho)
- **PostgreSQL** (Hospedado no Neon Database / `@neondatabase/serverless`)
- **Fastify JWT** (Autenticação via JSON Web Token)
- **Fastify CORS** (Gerenciamento de requisições cross-origin)

### Frontend
- **HTML5** & **CSS3** (Design escuro moderno, CSS Grid e Flexbox)
- **JavaScript (ES6+)**
- **Chart.js** (Renderização visual de gráficos de desempenho)
- **Plus Jakarta Sans / Inter** (Tipografia)

---

## 🗄️ Arquitetura e Banco de Dados

O banco de dados relacional utiliza o seguinte modelo conceitual:

- `users`: Cadastro e autenticação de usuários.
- `workouts`: Fichas e rotinas de treino organizadas por usuário.
- `exercises`: Catálogo de exercícios associados a grupos musculares.
- `workout_logs`: Registros de sessões iniciadas e concluídas (`started_at`, `ended_at`).
- `set_logs`: Detalhamento de cada série realizada (peso, repetições, número da série, flags de PR).

---

## 🚀 Instalação e Configuração Local

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm** ou **pnpm**
- Banco de dados **PostgreSQL** (Local ou URL do Neon Database)

### 1. Clonar o repositório
```bash
git clone [https://github.com/seu-usuario/RNGymHub.git](https://github.com/seu-usuario/RNGymHub.git)
cd RNGymHub