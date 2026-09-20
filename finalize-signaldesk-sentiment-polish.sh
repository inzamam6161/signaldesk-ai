#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "package.json" ]] || ! grep -q '"name": "signaldesk-ai"' package.json; then
  echo "Error: run this from the root of signaldesk-ai."
  exit 1
fi

echo "==> Applying final SignalDesk polish"

python3 <<'PY'
from pathlib import Path

path = Path("lib/feedback.ts")
text = path.read_text()
text = text.replace(
    'label: "Avg. classification confidence",',
    'label: "Avg. confidence",',
)
path.write_text(text)
PY

python3 <<'PY'
from pathlib import Path

path = Path("components/dashboard/DashboardClient.tsx")
text = path.read_text()

old = '''                    <div
                      aria-label="Sentiment distribution across current feedback"
                      className="chart"
                      role="img"
                    >
                      {chartData.map(
                        (value, index) => (
                          <div
                            className="chartColumn"
                            key={`${value}-${index}`}
                          >
                            <div
                              className="chartBar"
                              style={{
                                height: `${value}%`,
                              }}
                              title={`Sentiment index ${value}`}
                            />
                          </div>
                        ),
                      )}
                    </div>

                    <div className="chartLabels">
                      <span>Older</span>
                      <span>Current workspace</span>
                      <span>Recent</span>
                    </div>'''

new = '''                    <div
                      aria-label="Sentiment distribution across current feedback"
                      className="sentimentDistribution"
                      role="img"
                    >
                      {(["positive", "neutral", "negative"] as const).map(
                        (sentiment) => {
                          const count = workspaceFeedback.filter(
                            (item) => item.sentiment === sentiment,
                          ).length;

                          const percentage =
                            workspaceFeedback.length === 0
                              ? 0
                              : Math.round(
                                  (count / workspaceFeedback.length) * 100,
                                );

                          return (
                            <div
                              className="sentimentDistributionRow"
                              key={sentiment}
                            >
                              <div className="sentimentDistributionMeta">
                                <span className={`sentimentName ${sentiment}`}>
                                  {sentiment.charAt(0).toUpperCase() +
                                    sentiment.slice(1)}
                                </span>

                                <strong>
                                  {count} · {percentage}%
                                </strong>
                              </div>

                              <div
                                aria-hidden="true"
                                className="sentimentDistributionTrack"
                              >
                                <div
                                  className={`sentimentDistributionFill ${sentiment}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>'''

if old not in text:
    raise SystemExit(
        "Could not find the existing overview chart block. "
        "The file may already have been edited."
    )

text = text.replace(old, new)

text = text.replace(
    '''  const chartData = useMemo(
    () => buildSentimentSeries(workspaceFeedback),
    [workspaceFeedback],
  );

''',
    "",
)

text = text.replace(
    '''  buildMetrics,
  buildSentimentSeries,
  getTopicBreakdown,''',
    '''  buildMetrics,
  getTopicBreakdown,''',
)

path.write_text(text)
PY

python3 <<'PY'
from pathlib import Path

path = Path("app/globals.css")
text = path.read_text()

marker = "/* ===== SignalDesk final sentiment polish ===== */"
if marker in text:
    text = text.split(marker)[0].rstrip() + "\n"

css = r'''
.header .searchBox {
  width: min(340px, 32vw);
}

.sentimentDistribution {
  display: grid;
  gap: 18px;
  margin-top: 30px;
  padding: 8px 0 4px;
}

.sentimentDistributionRow {
  display: grid;
  gap: 8px;
}

.sentimentDistributionMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: .82rem;
}

.sentimentDistributionMeta strong {
  color: var(--text-primary);
  font-size: .84rem;
}

.sentimentName {
  font-weight: 800;
}

.sentimentName.positive {
  color: #2f9a5f;
}

.sentimentName.neutral {
  color: var(--text-secondary);
}

.sentimentName.negative {
  color: #d95050;
}

.sentimentDistributionTrack {
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-secondary);
  border: 1px solid var(--border);
}

.sentimentDistributionFill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  transition: width .28s ease;
}

.sentimentDistributionFill.positive {
  background: linear-gradient(90deg, #67b300, #8bc400);
}

.sentimentDistributionFill.neutral {
  background: linear-gradient(90deg, #8d9690, #adb5b0);
}

.sentimentDistributionFill.negative {
  background: linear-gradient(90deg, #d95050, #ef7777);
}

@media (max-width: 1100px) {
  .header .searchBox {
    width: min(300px, 40vw);
  }
}

@media (max-width: 760px) {
  .header .searchBox {
    width: 100%;
  }

  .sentimentDistribution {
    margin-top: 22px;
  }
}
'''

path.write_text(
    text.rstrip()
    + "\n\n"
    + marker
    + "\n"
    + css.strip()
    + "\n"
)
PY

echo "==> Running lint"
npm run lint

echo "==> Running tests"
npm test

echo "==> Running production build"
npm run build

echo
echo "============================================================"
echo "Final SignalDesk polish applied."
echo
echo "Changes:"
echo "  - real sentiment distribution chart"
echo "  - removed misleading time-axis language"
echo "  - Avg. confidence metric label"
echo "  - tighter header search width"
echo
echo "Review locally:"
echo "  npm run dev"
echo
echo "Then push:"
echo "  git add -A"
echo '  git commit -m "Polish SignalDesk sentiment visualization"'
echo "  git push"
echo "============================================================"
