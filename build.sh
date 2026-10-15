#!/bin/bash
# Render build for the single-service deployment.
# Installs Python deps, fetches Node, installs frontend deps, builds Next.js
# with the backend reachable at the /live rewrite prefix.
set -e
cd "$(dirname "$0")"

echo "--- python deps ---"
pip install -r backend/requirements.txt

if ! command -v node >/dev/null 2>&1; then
  echo "--- fetching node 20 ---"
  NODE_VERSION="v20.19.0"
  NODE_DIR="${HOME}/.nodejs"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz
  mkdir -p "${NODE_DIR}"
  tar -xf /tmp/node.tar.xz -C "${NODE_DIR}" --strip-components=1
  export PATH="${NODE_DIR}/bin:$PATH"
fi

node --version
npm --version

echo "--- frontend deps ---"
cd frontend
npm ci

echo "--- frontend build ---"
NEXT_PUBLIC_BACKEND_URL=/live npm run build
