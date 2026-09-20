#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "package.json" ]] || ! grep -q '"name": "signaldesk-ai"' package.json; then
  echo "Error: run this from the root of signaldesk-ai."
  exit 1
fi

echo "==> Isolating Vitest from the Cloudflare/Vinext Vite configuration"

cat > vitest.config.ts <<'EOF'
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
EOF

npm pkg set 'scripts.test=vitest run --config vitest.config.ts'
npm pkg set 'scripts.test:watch=vitest --config vitest.config.ts'

echo "==> Running lint"
npm run lint

echo "==> Running isolated unit tests"
npm test

echo "==> Running production build"
npm run build

echo
echo "============================================================"
echo "SignalDesk test configuration is now isolated from Cloudflare."
echo
echo "If all checks passed:"
echo "  npm run dev"
echo
echo "Then:"
echo "  git add -A"
echo '  git commit -m "Upgrade SignalDesk with evidence-based customer intelligence"'
echo "  git push"
echo "============================================================"
