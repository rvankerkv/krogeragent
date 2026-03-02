# kroger-recipe-agent

Monorepo MVP for recipe management, pantry tracking, shopping list generation, and an Azure AI Foundry-compatible agent workflow with Azure-hosted frontend/backend.

## 1) Local Dev Instructions

### Prerequisites

- Node.js 20+
- pnpm 9+
- Azure Functions Core Tools v4
- Azure CLI

### Install

```bash
pnpm install
```

### Run web app

```bash
pnpm --filter @kroger/web dev
```

Web runs on `http://localhost:5173`.

### Run API (Functions)

```bash
pnpm --filter @kroger/api dev
```

API runs on `http://localhost:7071`.

### Run tests

```bash
pnpm --filter @kroger/api test
```

## 2) Azure Prerequisites

- Azure subscription with permission to create:
  - Resource Group
  - Azure Static Web App
  - Azure Function App
  - Azure Storage Account
  - Azure Cosmos DB (NoSQL)
  - Azure Key Vault
  - Azure Application Insights
- GitHub repo with Actions enabled
- Federated credential configured for OIDC deployment from GitHub Actions

## 3) Manual Azure Resource Creation (If Needed)

1. Create a resource group:
   - `az group create -n <rg-name> -l <location>`
2. Deploy infrastructure:
   - `az deployment group create -g <rg-name> -f infra/main.bicep -p @infra/main.parameters.json`
3. Assign Function App managed identity Cosmos DB data-plane role:
   - Cosmos DB Built-in Data Contributor (scope: account)
4. Add Key Vault secrets for Kroger OAuth values.
5. Configure Function app settings from deployed outputs.

## 4) Register Kroger Developer App

1. Create a Kroger developer account and app at the Kroger developer portal.
2. Configure OAuth redirect URI to:
   - `<function-base-url>/api/kroger/auth/callback`
3. Collect:
   - `KROGER_CLIENT_ID`
   - `KROGER_CLIENT_SECRET`
   - `KROGER_REDIRECT_URI`
4. Store credentials as Key Vault secrets and expose with Key Vault references to Function App settings.

## 5) Environment Variables

Copy `.env.example` to `.env` (and app-specific `.env.local` files as needed).

### Shared

- `AZURE_COSMOS_ENDPOINT`
- `AZURE_COSMOS_DATABASE_NAME=kroger`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

### Kroger scaffold

- `KROGER_CLIENT_ID`
- `KROGER_CLIENT_SECRET`
- `KROGER_REDIRECT_URI`

### Frontend

- `VITE_API_BASE_URL` (ex: `/api`)

## 6) Deployment

### CI

- Workflow: `.github/workflows/ci.yml`
- Steps: install, lint, test, build web, build api

### Dev deploy

- Workflow: `.github/workflows/deploy-dev.yml`
- Steps:
  1. Azure login via OIDC
  2. Bicep deployment
  3. Functions deployment package publish
  4. Static Web App deployment

Required GitHub secrets/variables are documented in `deploy-dev.yml`.

## 7) Cost Estimates (Dev MVP)

Approximate monthly (low traffic):

- Static Web Apps Free: $0
- Function App Consumption: $0-$10 (usage-based)
- Storage Account (LRS): $1-$5
- Cosmos DB Serverless: $0-$25 (usage-based)
- Key Vault: <$1
- Application Insights: $0-$15 (log volume dependent)

Typical dev total range: **$5-$55/month**.
