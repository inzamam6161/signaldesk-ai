#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "package.json" ]] || ! grep -q '"name": "signaldesk-ai"' package.json; then
  echo "Error: run this from the root of signaldesk-ai."
  exit 1
fi

echo "==> Fixing React effect initialization lint rule"

python3 <<'PY'
from pathlib import Path

path = Path("components/dashboard/DashboardClient.tsx")
text = path.read_text()

old = '''  useEffect(() => {
    const savedTheme = window.localStorage.getItem(
      "signaldesk-theme",
    ) as Theme | null;

    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";

    setTheme(initialTheme);
    document.documentElement.dataset.theme =
      initialTheme;

    try {
      const savedWorkspace =
        window.localStorage.getItem(STORAGE_KEY);

      if (savedWorkspace) {
        const parsed = JSON.parse(
          savedWorkspace,
        ) as Feedback[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkspaceFeedback(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setWorkspaceReady(true);
    }
  }, []);'''

new = '''  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem(
        "signaldesk-theme",
      ) as Theme | null;

      const initialTheme =
        savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : "dark";

      setTheme(initialTheme);
      document.documentElement.dataset.theme =
        initialTheme;

      try {
        const savedWorkspace =
          window.localStorage.getItem(STORAGE_KEY);

        if (savedWorkspace) {
          const parsed = JSON.parse(
            savedWorkspace,
          ) as Feedback[];

          if (
            Array.isArray(parsed) &&
            parsed.length > 0
          ) {
            setWorkspaceFeedback(parsed);
          }
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setWorkspaceReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);'''

if old not in text:
    raise SystemExit(
        "Could not find the expected initialization effect. "
        "The file may already have been edited."
    )

path.write_text(text.replace(old, new))
PY

echo "==> Running lint"
npm run lint

echo "==> Running tests"
npm test

echo "==> Running production build"
npm run build

echo
echo "============================================================"
echo "SignalDesk initialization lint fix applied."
echo
echo "If all checks passed:"
echo "  npm run dev"
echo
echo "Then:"
echo "  git add -A"
echo '  git commit -m "Upgrade SignalDesk with evidence-based customer intelligence"'
echo "  git push"
echo "============================================================"
