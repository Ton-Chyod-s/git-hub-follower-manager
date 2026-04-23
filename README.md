# GitHub Follower Manager API

API REST para gerenciamento de seguidores do GitHub. Permite verificar reciprocidade de follows, seguir/deixar de seguir em lote, clonar seguidores de perfis referência e filtrar bots. Inclui sistema completo de autenticação com JWT e OAuth via GitHub.

---

## Stack

- **Node.js + TypeScript**
- **Express** — framework HTTP
- **Neon Serverless** — PostgreSQL serverless
- **Argon2** — hash de senhas
- **JWT** — autenticação stateless
- **Zod** — validação de schemas
- **Swagger UI** — documentação interativa

---

## Arquitetura

Modular com camadas internas inspirada em Clean Architecture.

```
src/
├── auth/                   # Módulo de autenticação
│   ├── controllers/        # Recebe req/res, chama usecases
│   ├── middleware/         # authMiddleware, requireRole
│   ├── repositories/       # Acesso ao banco (users, refresh_tokens)
│   ├── routes/             # Endpoints + JSDoc Swagger
│   └── usecases/           # Regras de negócio
├── github/                 # Módulo de gerenciamento de seguidores
│   ├── requests/           # Chamadas HTTP à API do GitHub
│   ├── routes/             # Endpoints + JSDoc Swagger
│   ├── types/              # Interfaces TypeScript
│   └── usecases/           # Regras de negócio
├── shared/
│   └── middlewares/        # Error handler global, rate limit
├── config/                 # Swagger, variáveis de ambiente
├── db/                     # Client Neon + migrations SQL
└── utils/                  # Helpers compartilhados (jwt, hash, AppError...)
```

---

## Instalação

### Requisitos

- Node.js v18+
- Projeto no [Neon](https://neon.tech)
- GitHub Personal Access Token (escopo `user`)
- GitHub OAuth App (para login social)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp src/config/.env.example src/config/.env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Neon |
| `JWT_SECRET` | Segredo para assinar tokens (mín. 32 chars) |
| `JWT_EXPIRES_IN` | Expiração do access token (ex: `15m`) |
| `KEY` | GitHub Personal Access Token |
| `USER` | Seu username do GitHub |
| `GITHUB_CLIENT_ID` | ID do OAuth App |
| `GITHUB_CLIENT_SECRET` | Secret do OAuth App |
| `GITHUB_REDIRECT_URI` | Callback URL do OAuth |
| `CORS_ORIGIN` | URL do frontend (ex: `http://localhost:5173`) |

> Gere seu PAT em: **GitHub > Settings > Developer settings > Personal access tokens**
> Crie um OAuth App em: **GitHub > Settings > Developer settings > OAuth Apps**

### 3. Rodar a migration

```bash
psql "$DATABASE_URL" -f src/db/migrations/001_create_auth_tables.sql
```

Ou cole o conteúdo do arquivo diretamente no **SQL Editor** do Neon.

### 4. Rodar a aplicação

```bash
# desenvolvimento (hot reload)
npm run dev

# produção
npm run build && npm start
```

| Serviço | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |

---

## Endpoints

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cria nova conta |
| `POST` | `/auth/login` | Login com email e senha |
| `POST` | `/auth/refresh` | Renova o access token |
| `POST` | `/auth/logout` | Logout e invalida tokens |
| `GET` | `/auth/me` | Retorna dados do usuário autenticado |
| `GET` | `/auth/github` | Inicia fluxo OAuth com GitHub |
| `GET` | `/auth/github/callback` | Callback do OAuth GitHub |

### GitHub Follower

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/check-follower` | Quem você segue mas não te segue de volta |
| `GET` | `/check-unfollower` | Quem te segue mas você ainda não segue |
| `POST` | `/follow-users` | Segue seguidores orgânicos de um usuário alvo |
| `POST` | `/new-follower` | Segue um ou mais usuários específicos |
| `DELETE` | `/unfollow-users` | Deixa de seguir uma lista de usuários |
| `POST` | `/filter-organic` | Separa usuários orgânicos de suspeitos (bots) |

### Exemplos de body

**POST `/follow-users`**
```json
{ "targetUser": "conta_referencia" }
```

**POST `/new-follower`**
```json
{ "usernames": ["usuario1", "usuario2"] }
```

**DELETE `/unfollow-users`**
```json
{ "usernames": ["usuario1", "usuario2"] }
```

**POST `/filter-organic`**
```json
{ "usernames": ["usuario1", "usuario2", "usuario3"] }
```

---

## Scripts

```bash
npm run dev          # desenvolvimento com hot reload
npm run build        # compila para dist/
npm start            # inicia a build de produção
npm run lint         # verifica linting
npm run lint:fix     # corrige linting automaticamente
npm run format       # formata com Prettier
```

---

## Licença

ISC
