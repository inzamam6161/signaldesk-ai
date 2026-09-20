# SignalDesk

**Customer-intelligence dashboard built with Next.js, React and TypeScript.**

SignalDesk is a portfolio engineering project for exploring customer feedback,
tracking recurring issues, and turning a small feedback workspace into transparent
product insights.

The current build intentionally uses deterministic analysis rather than pretending
that rule-based processing is a generative AI model.

## What is functional

- Search and sentiment filtering across customer feedback
- Add new feedback directly from the dashboard
- Automatic rule-based sentiment classification with manual override
- Local workspace persistence with `localStorage`
- Follow-up tracking for individual conversations
- Dynamic metrics derived from the actual workspace
- Dynamic sentiment visualization
- Topic detection across recurring customer themes
- Evidence-based server analysis through `/api/analyze`
- Supporting evidence snippets for generated insights
- CSV export for the current filtered view
- Functional Overview, Feedback and Insights navigation
- Command palette (`Cmd/Ctrl + K`)
- Light and dark themes
- Responsive layout
- Accessible controls and reduced-motion support
- Unit tests and GitHub Actions CI

## Product flow

```text
Customer feedback
      ↓
Search / filters / local workspace
      ↓
Sentiment classification
      ↓
Topic detection
      ↓
Server-side evidence analysis
      ↓
Priority + evidence + follow-up action
```

## Analysis philosophy

SignalDesk follows a simple rule:

> **Only claim what the current feedback supports.**

The analysis route calculates:

- positive / neutral / negative counts,
- negative ratio,
- actual recurring-topic mentions,
- average classification confidence,
- priority based on the visible negative ratio,
- supporting feedback snippets.

It does not invent unsupported claims about customer platform, geography,
time of day, or volume.

## Local feedback workspace

New feedback can be added from the dashboard.

SignalDesk automatically classifies the text using transparent keyword rules.
The user can override the classification before saving.

The workspace is stored locally in the browser, so additions and follow-up
flags remain available after refresh without requiring a backend database.

Use the command palette to reset the workspace back to the bundled sample data.

## Stack

- Next.js 16
- React 19
- TypeScript
- Vinext / Vite
- Cloudflare tooling
- Vitest
- GitHub Actions

## Architecture

```text
app/
  api/analyze/route.ts       HTTP validation and response

components/
  dashboard/                 workspace interactions
  layout/                    shell, header and navigation

lib/
  feedback.ts                classification, metrics, topics, chart data
  analyzeFeedback.ts         evidence-based insight engine

data/
  dashboard.ts               bundled demo feedback

types/
  analysis.ts
  dashboard.ts
```

The HTTP route is deliberately thin. Analysis rules live in a pure module so
they can be tested independently and later replaced by a production model
provider without rewriting the dashboard.

## Testing

```bash
npm test
```

Tests cover:

- sentiment classification,
- dynamic workspace metrics,
- recurring topic detection,
- actual topic mention counts,
- evidence generation,
- protection against unsupported analysis claims.

CI runs lint, tests and the production build.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build
```

## Current limitations

- The bundled workspace is demo data.
- Classification is deterministic and keyword-based.
- The current analysis engine is not a generative LLM.
- There is no authenticated multi-user backend or shared database.
- Local feedback added in the portfolio build is stored only in the current browser.

## Future production path

A production version could add:

1. authenticated workspaces,
2. persistent database storage,
3. ingestion from support tools and app stores,
4. embeddings / clustering for larger feedback volumes,
5. a model-provider adapter for grounded summaries,
6. observability and human-review workflows.

The current architecture keeps these additions separate from the UI and
deterministic analysis layer.
