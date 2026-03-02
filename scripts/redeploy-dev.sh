#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/redeploy-dev.sh -g <resource-group> -f <function-app-name> -s <static-web-app-name> [options]

Required:
  -g, --resource-group     Azure resource group name
  -f, --function-app       Azure Function App name
  -s, --static-web-app     Azure Static Web App name

Options:
      --skip-api           Skip Function App build/deploy
      --skip-web           Skip Static Web App build/deploy
      --skip-install       Skip npm install steps
      --api-only           Equivalent to --skip-web
      --web-only           Equivalent to --skip-api
  -h, --help               Show this help

Examples:
  ./scripts/redeploy-dev.sh -g rg-kroger-agent -f krogerra-func-dev -s krogerra-swa-dev
  ./scripts/redeploy-dev.sh -g rg-kroger-agent -f krogerra-func-dev -s krogerra-swa-dev --api-only
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RESOURCE_GROUP=""
FUNCTION_APP_NAME=""
STATIC_WEB_APP_NAME=""
SKIP_API=0
SKIP_WEB=0
SKIP_INSTALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g|--resource-group)
      RESOURCE_GROUP="${2:-}"
      shift 2
      ;;
    -f|--function-app)
      FUNCTION_APP_NAME="${2:-}"
      shift 2
      ;;
    -s|--static-web-app)
      STATIC_WEB_APP_NAME="${2:-}"
      shift 2
      ;;
    --skip-api|--web-only)
      SKIP_API=1
      shift
      ;;
    --skip-web|--api-only)
      SKIP_WEB=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$RESOURCE_GROUP" || -z "$FUNCTION_APP_NAME" || -z "$STATIC_WEB_APP_NAME" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

command -v az >/dev/null 2>&1 || { echo "Azure CLI is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required."; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "zip is required."; exit 1; }

echo "Using repo root: ${REPO_ROOT}"
cd "$REPO_ROOT"

if [[ "$SKIP_API" -eq 0 ]]; then
  echo "==> Deploying API to Function App: ${FUNCTION_APP_NAME}"
  cd "${REPO_ROOT}/services/api"
  rm -rf dist api.zip

  if [[ "$SKIP_INSTALL" -eq 0 ]]; then
    npm install
  fi

  npm run build
  npm prune --omit=dev
  zip -r api.zip dist host.json package.json node_modules >/dev/null

  az functionapp deployment source config-zip \
    -g "$RESOURCE_GROUP" \
    -n "$FUNCTION_APP_NAME" \
    --src api.zip

  az functionapp restart -g "$RESOURCE_GROUP" -n "$FUNCTION_APP_NAME"
fi

if [[ "$SKIP_WEB" -eq 0 ]]; then
  echo "==> Deploying Web to Static Web App: ${STATIC_WEB_APP_NAME}"
  cd "${REPO_ROOT}/apps/web"

  if [[ "$SKIP_INSTALL" -eq 0 ]]; then
    npm install
  fi

  npm run build

  SWA_TOKEN="$(az staticwebapp secrets list -g "$RESOURCE_GROUP" -n "$STATIC_WEB_APP_NAME" --query properties.apiKey -o tsv)"
  if [[ -z "$SWA_TOKEN" ]]; then
    echo "Failed to resolve Static Web App deployment token." >&2
    exit 1
  fi

  cd "$REPO_ROOT"
  npx @azure/static-web-apps-cli deploy apps/web/dist --deployment-token "$SWA_TOKEN" --env production
fi

echo "Done."
