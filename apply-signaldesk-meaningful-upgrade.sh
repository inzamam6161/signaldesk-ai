#!/usr/bin/env bash
set -euo pipefail

# SignalDesk AI — meaningful portfolio upgrade
# Run from the root of signaldesk-ai:
#   bash apply-signaldesk-meaningful-upgrade.sh

if [[ ! -f "package.json" ]] || ! grep -q '"name": "signaldesk-ai"' package.json; then
  echo "Error: run this script from the root of signaldesk-ai."
  exit 1
fi

echo "==> Applying SignalDesk meaningful functionality upgrade"

mkdir -p lib components/dashboard .github/workflows

# ---------------------------------------------------------------------------
# 1. Repository hygiene
# ---------------------------------------------------------------------------
if ! grep -qxF "/.vinext/" .gitignore; then
  printf "\n# generated vinext output\n/.vinext/\n" >> .gitignore
fi

git rm -r --cached .vinext >/dev/null 2>&1 || true
rm -rf .vinext

# ---------------------------------------------------------------------------
# 2. Types
# ---------------------------------------------------------------------------
cat > types/dashboard.ts <<'EOF'
export type TrendDirection = "up" | "down" | "neutral";

export type Sentiment = "positive" | "neutral" | "negative";

export type DashboardView = "overview" | "feedback" | "insights";

export interface Metric {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: TrendDirection;
  description: string;
}

export interface Feedback {
  id: string;
  customer: string;
  company: string;
  message: string;
  sentiment: Sentiment;
  score: number;
  createdAt: string;
  followUp?: boolean;
}

export interface NewFeedbackInput {
  customer: string;
  company: string;
  message: string;
  sentiment: Sentiment;
  score: number;
}
EOF

cat > types/analysis.ts <<'EOF'
import type { Sentiment } from "@/types/dashboard";

export interface AnalysisFeedbackInput {
  message: string;
  sentiment: Sentiment;
  score: number;
}

export interface AnalysisRequest {
  feedback: AnalysisFeedbackInput[];
}

export interface AnalysisResult {
  title: string;
  summary: string;
  mentions: number;
  priority: "Low" | "Medium" | "High";
  confidence: number;
  generatedAt: string;
  topTopic: string;
  counts: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  evidence: string[];
}
EOF

# ---------------------------------------------------------------------------
# 3. Real reusable feedback intelligence
# ---------------------------------------------------------------------------
cat > lib/feedback.ts <<'EOF'
import type {
  Feedback,
  Metric,
  Sentiment,
} from "@/types/dashboard";

const positiveWords = [
  "excellent",
  "great",
  "love",
  "fast",
  "faster",
  "helpful",
  "saved",
  "easy",
  "improved",
  "smooth",
  "good",
  "perfect",
  "happy",
  "useful",
];

const negativeWords = [
  "slow",
  "delay",
  "delays",
  "broken",
  "error",
  "issue",
  "issues",
  "problem",
  "problems",
  "frustrating",
  "bad",
  "failed",
  "failure",
  "crash",
  "crashes",
  "difficult",
  "too long",
];

export const topicDefinitions = [
  {
    id: "notifications",
    label: "Notifications",
    keywords: ["notification", "notifications", "push", "alert", "alerts"],
  },
  {
    id: "performance",
    label: "Performance",
    keywords: ["slow", "faster", "speed", "performance", "lag", "latency"],
  },
  {
    id: "exports",
    label: "Exports & reports",
    keywords: ["export", "exports", "report", "reports", "download", "csv"],
  },
  {
    id: "mobile",
    label: "Mobile experience",
    keywords: ["mobile", "android", "ios", "iphone", "app"],
  },
  {
    id: "billing",
    label: "Billing",
    keywords: ["billing", "invoice", "payment", "price", "pricing", "subscription"],
  },
  {
    id: "support",
    label: "Support",
    keywords: ["support", "response", "ticket", "help", "agent"],
  },
] as const;

export function classifyFeedback(message: string): {
  sentiment: Sentiment;
  score: number;
} {
  const normalized = message.toLowerCase();

  const positiveMatches = positiveWords.filter((word) =>
    normalized.includes(word),
  ).length;

  const negativeMatches = negativeWords.filter((word) =>
    normalized.includes(word),
  ).length;

  if (positiveMatches === 0 && negativeMatches === 0) {
    return {
      sentiment: "neutral",
      score: 62,
    };
  }

  const difference = Math.abs(positiveMatches - negativeMatches);
  const score = Math.min(
    96,
    70 + difference * 8 + Math.max(positiveMatches, negativeMatches) * 3,
  );

  if (positiveMatches > negativeMatches) {
    return {
      sentiment: "positive",
      score,
    };
  }

  if (negativeMatches > positiveMatches) {
    return {
      sentiment: "negative",
      score,
    };
  }

  return {
    sentiment: "neutral",
    score: 68,
  };
}

export function getTopicBreakdown(
  feedback: Array<Pick<Feedback, "message">>,
) {
  return topicDefinitions
    .map((topic) => {
      const matchingMessages = feedback.filter((item) => {
        const normalized = item.message.toLowerCase();

        return topic.keywords.some((keyword) =>
          normalized.includes(keyword),
        );
      });

      return {
        id: topic.id,
        label: topic.label,
        count: matchingMessages.length,
      };
    })
    .filter((topic) => topic.count > 0)
    .sort((left, right) => right.count - left.count);
}

export function buildMetrics(feedback: Feedback[]): Metric[] {
  const total = feedback.length;

  const positiveCount = feedback.filter(
    (item) => item.sentiment === "positive",
  ).length;

  const negativeCount = feedback.filter(
    (item) => item.sentiment === "negative",
  ).length;

  const followUpCount = feedback.filter(
    (item) => item.followUp,
  ).length;

  const positivePercentage =
    total === 0 ? 0 : Math.round((positiveCount / total) * 100);

  const averageConfidence =
    total === 0
      ? 0
      : Math.round(
          feedback.reduce(
            (sum, item) => sum + item.score,
            0,
          ) / total,
        );

  return [
    {
      id: "feedback",
      label: "Feedback in workspace",
      value: String(total),
      change: `${positiveCount} positive`,
      trend: positiveCount >= negativeCount ? "up" : "down",
      description: "Current local workspace",
    },
    {
      id: "sentiment",
      label: "Positive sentiment",
      value: `${positivePercentage}%`,
      change: `${negativeCount} negative`,
      trend:
        positivePercentage >= 60
          ? "up"
          : positivePercentage >= 40
            ? "neutral"
            : "down",
      description: "Calculated from current data",
    },
    {
      id: "confidence",
      label: "Avg. classification confidence",
      value: `${averageConfidence}%`,
      change: "Rule-based",
      trend: "neutral",
      description: "Transparent local classifier",
    },
    {
      id: "follow-up",
      label: "Needs follow-up",
      value: String(followUpCount),
      change: `${negativeCount} negative`,
      trend: followUpCount > 0 ? "down" : "neutral",
      description: "Manually tracked actions",
    },
  ];
}

export function buildSentimentSeries(
  feedback: Feedback[],
): number[] {
  if (feedback.length === 0) {
    return [50];
  }

  return feedback
    .slice(0, 12)
    .reverse()
    .map((item) => {
      if (item.sentiment === "positive") {
        return 86;
      }

      if (item.sentiment === "negative") {
        return 28;
      }

      return 58;
    });
}
EOF

cat > lib/analyzeFeedback.ts <<'EOF'
import type {
  AnalysisFeedbackInput,
  AnalysisResult,
} from "@/types/analysis";
import { getTopicBreakdown, topicDefinitions } from "@/lib/feedback";

export function analyzeFeedback(
  feedback: AnalysisFeedbackInput[],
): AnalysisResult {
  const total = feedback.length;

  const positiveCount = feedback.filter(
    (item) => item.sentiment === "positive",
  ).length;

  const neutralCount = feedback.filter(
    (item) => item.sentiment === "neutral",
  ).length;

  const negativeCount = feedback.filter(
    (item) => item.sentiment === "negative",
  ).length;

  const topics = getTopicBreakdown(feedback);
  const topTopic = topics[0];

  const mentions = topTopic?.count ?? 0;
  const topicLabel = topTopic?.label ?? "General feedback";

  const negativeRatio =
    total === 0 ? 0 : negativeCount / total;

  const priority: AnalysisResult["priority"] =
    negativeRatio >= 0.4
      ? "High"
      : negativeRatio >= 0.2
        ? "Medium"
        : "Low";

  const averageConfidence =
    total === 0
      ? 0
      : Math.round(
          feedback.reduce(
            (sum, item) => sum + item.score,
            0,
          ) / total,
        );

  let title = "Review customer feedback";

  if (topTopic && negativeCount > 0) {
    title = `Investigate ${topicLabel.toLowerCase()}`;
  } else if (positiveCount > negativeCount) {
    title = "Preserve positive momentum";
  }

  const summaryParts = [
    `${negativeCount} of ${total} visible conversations are negative.`,
  ];

  if (topTopic) {
    summaryParts.push(
      `${mentions} conversation${mentions === 1 ? "" : "s"} mention ${topicLabel.toLowerCase()}.`,
    );
  }

  if (positiveCount > negativeCount) {
    summaryParts.push(
      `Positive feedback is currently more common than negative feedback (${positiveCount} vs ${negativeCount}).`,
    );
  }

  const evidence = feedback
    .filter((item) => {
      if (!topTopic) {
        return item.sentiment === "negative";
      }

      const definition = topicDefinitions.find(
        (topic) => topic.id === topTopic.id,
      );

      if (!definition) {
        return false;
      }

      const normalized = item.message.toLowerCase();

      return definition.keywords.some((keyword) =>
        normalized.includes(keyword),
      );
    })
    .slice(0, 3)
    .map((item) =>
      item.message.length > 118
        ? `${item.message.slice(0, 115)}...`
        : item.message,
    );

  return {
    title,
    summary: summaryParts.join(" "),
    mentions,
    priority,
    confidence: Math.min(98, Math.max(0, averageConfidence)),
    generatedAt: new Date().toISOString(),
    topTopic: topicLabel,
    counts: {
      total,
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount,
    },
    evidence,
  };
}
EOF

# ---------------------------------------------------------------------------
# 4. Evidence-based API route
# ---------------------------------------------------------------------------
cat > app/api/analyze/route.ts <<'EOF'
import { NextResponse } from "next/server";

import { analyzeFeedback } from "@/lib/analyzeFeedback";
import type {
  AnalysisRequest,
  AnalysisFeedbackInput,
} from "@/types/analysis";

const validSentiments = new Set([
  "positive",
  "neutral",
  "negative",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnalysisRequest>;

    if (!Array.isArray(body.feedback) || body.feedback.length === 0) {
      return NextResponse.json(
        {
          message: "At least one feedback record is required.",
        },
        {
          status: 400,
        },
      );
    }

    const validFeedback = body.feedback
      .filter(
        (item): item is AnalysisFeedbackInput =>
          typeof item?.message === "string" &&
          item.message.trim().length > 0 &&
          typeof item.score === "number" &&
          Number.isFinite(item.score) &&
          typeof item.sentiment === "string" &&
          validSentiments.has(item.sentiment),
      )
      .slice(0, 100);

    if (validFeedback.length === 0) {
      return NextResponse.json(
        {
          message: "No valid feedback records were provided.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      analyzeFeedback(validFeedback),
    );
  } catch {
    return NextResponse.json(
      {
        message: "The analysis request could not be processed.",
      },
      {
        status: 500,
      },
    );
  }
}
EOF

# ---------------------------------------------------------------------------
# 5. Add Feedback — real local feature with auto classification
# ---------------------------------------------------------------------------
cat > components/dashboard/AddFeedbackModal.tsx <<'EOF'
import { useMemo, useState } from "react";

import { classifyFeedback } from "@/lib/feedback";
import type { NewFeedbackInput } from "@/types/dashboard";

interface AddFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (feedback: NewFeedbackInput) => void;
}

export function AddFeedbackModal({
  isOpen,
  onClose,
  onAdd,
}: AddFeedbackModalProps) {
  const [customer, setCustomer] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [manualSentiment, setManualSentiment] =
    useState<NewFeedbackInput["sentiment"] | "">("");

  const classification = useMemo(
    () => classifyFeedback(message),
    [message],
  );

  if (!isOpen) {
    return null;
  }

  const selectedSentiment =
    manualSentiment || classification.sentiment;

  const submit = () => {
    if (
      customer.trim().length < 2 ||
      company.trim().length < 2 ||
      message.trim().length < 8
    ) {
      return;
    }

    onAdd({
      customer: customer.trim(),
      company: company.trim(),
      message: message.trim(),
      sentiment: selectedSentiment,
      score:
        manualSentiment.length > 0
          ? Math.max(72, classification.score)
          : classification.score,
    });

    setCustomer("");
    setCompany("");
    setMessage("");
    setManualSentiment("");
    onClose();
  };

  return (
    <div
      className="modalOverlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-label="Add customer feedback"
        aria-modal="true"
        className="feedbackComposer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="drawerHeader">
          <div>
            <p className="eyebrow">Local workspace</p>
            <h2>Add customer feedback</h2>
          </div>

          <button
            aria-label="Close add feedback dialog"
            className="drawerCloseButton"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="composerGrid">
          <label>
            Customer
            <input
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="e.g. Maya Patel"
              value={customer}
            />
          </label>

          <label>
            Company
            <input
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Northstar Labs"
              value={company}
            />
          </label>
        </div>

        <label>
          Feedback
          <textarea
            onChange={(event) => {
              setMessage(event.target.value);
              setManualSentiment("");
            }}
            placeholder="Paste or type the customer message..."
            rows={5}
            value={message}
          />
        </label>

        <section className="classificationPreview">
          <div>
            <span>Automatic classification</span>
            <strong className={`drawerSentiment ${selectedSentiment}`}>
              {selectedSentiment}
            </strong>
          </div>

          <div>
            <span>Confidence</span>
            <strong>{classification.score}%</strong>
          </div>

          <label>
            Override
            <select
              onChange={(event) =>
                setManualSentiment(
                  event.target.value as
                    | NewFeedbackInput["sentiment"]
                    | "",
                )
              }
              value={manualSentiment}
            >
              <option value="">Use automatic</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>
        </section>

        <p className="truthNote">
          Classification runs locally with transparent keyword rules.
          You can override the result before saving.
        </p>

        <div className="drawerActions">
          <button
            className="secondaryButton"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="primaryButton"
            disabled={
              customer.trim().length < 2 ||
              company.trim().length < 2 ||
              message.trim().length < 8
            }
            onClick={submit}
            type="button"
          >
            Add to workspace
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
EOF

# ---------------------------------------------------------------------------
# 6. Functional navigation
# ---------------------------------------------------------------------------
cat > components/layout/Sidebar.tsx <<'EOF'
import type { DashboardView } from "@/types/dashboard";

const navigationItems: Array<{
  id: DashboardView;
  label: string;
  icon: string;
}> = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "feedback", label: "Feedback", icon: "◫" },
  { id: "insights", label: "Insights", icon: "✦" },
];

interface SidebarProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function Sidebar({
  activeView,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">S</div>

        <div>
          <strong>SignalDesk</strong>
          <span>Customer Intelligence</span>
        </div>
      </div>

      <nav className="sidebarNavigation" aria-label="Main navigation">
        <p className="navigationLabel">Workspace</p>

        {navigationItems.map((item) => (
          <button
            aria-current={
              activeView === item.id ? "page" : undefined
            }
            className={`navigationItem ${
              activeView === item.id ? "active" : ""
            }`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span className="navigationIcon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="workspaceCard">
          <span className="statusDot" />

          <div>
            <strong>Analysis engine ready</strong>
            <span>Evidence-based demo processing</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
EOF

cat > components/layout/Header.tsx <<'EOF'
import type { DashboardView } from "@/types/dashboard";

interface HeaderProps {
  activeView: DashboardView;
  searchQuery: string;
  theme: "dark" | "light";
  onSearchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onAddFeedback: () => void;
}

const viewCopy: Record<
  DashboardView,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Customer intelligence",
    title: "Customer overview",
    description:
      "Understand sentiment, risks and recurring themes from the current workspace.",
  },
  feedback: {
    eyebrow: "Feedback workspace",
    title: "Customer conversations",
    description:
      "Search, filter, add and track customer feedback in one place.",
  },
  insights: {
    eyebrow: "Evidence-based insights",
    title: "What needs attention",
    description:
      "Generate transparent analysis from the conversations currently in view.",
  },
};

export function Header({
  activeView,
  searchQuery,
  theme,
  onSearchChange,
  onOpenCommandPalette,
  onToggleTheme,
  onExport,
  onAddFeedback,
}: HeaderProps) {
  const copy = viewCopy[activeView];

  return (
    <header className="header">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="headerDescription">
          {copy.description}
        </p>
      </div>

      <div className="headerActions">
        <label className="searchBox">
          <span aria-hidden="true">⌕</span>

          <input
            aria-label="Search customer feedback"
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search feedback..."
            type="search"
            value={searchQuery}
          />

          <button
            aria-label="Open command palette"
            className="keyboardShortcut"
            onClick={onOpenCommandPalette}
            type="button"
          >
            ⌘ K
          </button>
        </label>

        <button
          className="headerAddButton"
          onClick={onAddFeedback}
          type="button"
        >
          + Add feedback
        </button>

        <button
          aria-label="Export filtered feedback"
          className="iconButton"
          onClick={onExport}
          title="Export feedback"
          type="button"
        >
          ⇩
        </button>

        <button
          aria-label={`Switch to ${
            theme === "dark" ? "light" : "dark"
          } theme`}
          className="iconButton"
          onClick={onToggleTheme}
          title="Change theme"
          type="button"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>

        <div className="profileButton" aria-label="Demo workspace">
          <span className="profileAvatar">DW</span>

          <span className="profileDetails">
            <strong>Demo Workspace</strong>
            <small>Product Team</small>
          </span>
        </div>
      </div>
    </header>
  );
}
EOF

# ---------------------------------------------------------------------------
# 7. Honest feedback labels + functional follow-up
# ---------------------------------------------------------------------------
cat > components/dashboard/FeedbackItem.tsx <<'EOF'
import type { Feedback } from "@/types/dashboard";

interface FeedbackItemProps {
  feedback: Feedback;
  onOpen: (feedback: Feedback) => void;
}

const sentimentLabels = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function FeedbackItem({
  feedback,
  onOpen,
}: FeedbackItemProps) {
  const initials = feedback.customer
    .split(" ")
    .map((name) => name[0])
    .join("");

  return (
    <article className="feedbackItem">
      <div className="customerAvatar">{initials}</div>

      <div className="feedbackContent">
        <div className="feedbackHeader">
          <div>
            <strong>{feedback.customer}</strong>
            <span>{feedback.company}</span>
          </div>

          <time>{feedback.createdAt}</time>
        </div>

        <p>{feedback.message}</p>

        <div className="feedbackMetadata">
          <span className={`sentimentBadge ${feedback.sentiment}`}>
            {sentimentLabels[feedback.sentiment]}
          </span>

          <span>
            Classification confidence: {feedback.score}%
          </span>

          {feedback.followUp && (
            <span className="followUpBadge">
              Follow-up
            </span>
          )}
        </div>
      </div>

      <button
        aria-label={`Open feedback from ${feedback.customer}`}
        className="feedbackAction"
        onClick={() => onOpen(feedback)}
        type="button"
      >
        →
      </button>
    </article>
  );
}
EOF

cat > components/dashboard/FeedbackDrawer.tsx <<'EOF'
import { useEffect } from "react";

import type { Feedback } from "@/types/dashboard";

interface FeedbackDrawerProps {
  feedback: Feedback | null;
  onClose: () => void;
  onToggleFollowUp: (feedbackId: string) => void;
}

const recommendations = {
  positive:
    "Share the positive signal with the product team and capture what is working.",
  neutral:
    "Review the reported friction and decide whether a product follow-up is needed.",
  negative:
    "Prioritize a follow-up and investigate the customer-reported issue.",
};

export function FeedbackDrawer({
  feedback,
  onClose,
  onToggleFollowUp,
}: FeedbackDrawerProps) {
  useEffect(() => {
    if (!feedback) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [feedback, onClose]);

  if (!feedback) {
    return null;
  }

  return (
    <div
      className="drawerOverlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <aside
        aria-label={`Feedback details for ${feedback.customer}`}
        aria-modal="true"
        className="feedbackDrawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="drawerHeader">
          <div>
            <p className="eyebrow">Customer conversation</p>
            <h2>Feedback details</h2>
          </div>

          <button
            aria-label="Close feedback details"
            className="drawerCloseButton"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <section className="drawerCustomer">
          <div className="drawerAvatar">
            {feedback.customer
              .split(" ")
              .map((name) => name[0])
              .join("")}
          </div>

          <div>
            <strong>{feedback.customer}</strong>
            <span>{feedback.company}</span>
          </div>
        </section>

        <section className="drawerSection">
          <span className="drawerLabel">Customer message</span>
          <p>{feedback.message}</p>
        </section>

        <section className="drawerStats">
          <div>
            <span>Sentiment</span>
            <strong
              className={`drawerSentiment ${feedback.sentiment}`}
            >
              {feedback.sentiment}
            </strong>
          </div>

          <div>
            <span>Classification confidence</span>
            <strong>{feedback.score}%</strong>
          </div>

          <div>
            <span>Received</span>
            <strong>{feedback.createdAt}</strong>
          </div>
        </section>

        <section className="drawerAiSummary">
          <div className="aiIcon">✓</div>

          <div>
            <span className="drawerLabel">Suggested action</span>
            <p>{recommendations[feedback.sentiment]}</p>
          </div>
        </section>

        <div className="drawerActions">
          <button
            className={
              feedback.followUp
                ? "primaryButton"
                : "secondaryButton"
            }
            onClick={() =>
              onToggleFollowUp(feedback.id)
            }
            type="button"
          >
            {feedback.followUp
              ? "✓ Follow-up tracked"
              : "Create follow-up"}
          </button>
        </div>
      </aside>
    </div>
  );
}
EOF

# ---------------------------------------------------------------------------
# 8. Command palette becomes actually useful
# ---------------------------------------------------------------------------
cat > components/dashboard/CommandPalette.tsx <<'EOF'
import type {
  DashboardView,
  Sentiment,
} from "@/types/dashboard";

type FeedbackFilter = "all" | Sentiment;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSearch: () => void;
  onSelectFilter: (filter: FeedbackFilter) => void;
  onNavigate: (view: DashboardView) => void;
  onAddFeedback: () => void;
  onResetWorkspace: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onClearSearch,
  onSelectFilter,
  onNavigate,
  onAddFeedback,
  onResetWorkspace,
}: CommandPaletteProps) {
  if (!isOpen) {
    return null;
  }

  const runCommand = (command: () => void) => {
    command();
    onClose();
  };

  return (
    <div
      aria-label="Command palette"
      aria-modal="true"
      className="commandOverlay"
      onMouseDown={onClose}
      role="dialog"
    >
      <section
        className="commandPalette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="commandHeader">
          <div>
            <p className="eyebrow">Quick actions</p>
            <h2>Command palette</h2>
          </div>

          <button
            aria-label="Close command palette"
            className="commandCloseButton"
            onClick={onClose}
            type="button"
          >
            Esc
          </button>
        </div>

        <div className="commandList">
          <button
            onClick={() =>
              runCommand(() => {
                onNavigate("feedback");
                onAddFeedback();
              })
            }
            type="button"
          >
            <span className="commandIcon">＋</span>
            <span>
              <strong>Add customer feedback</strong>
              <small>
                Add and automatically classify a conversation
              </small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(() => onNavigate("insights"))
            }
            type="button"
          >
            <span className="commandIcon">✦</span>
            <span>
              <strong>Open insights</strong>
              <small>
                Review evidence-based customer themes
              </small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(() => {
                onNavigate("feedback");
                onClearSearch();
                onSelectFilter("negative");
              })
            }
            type="button"
          >
            <span className="commandIcon">!</span>
            <span>
              <strong>Show customer risks</strong>
              <small>
                Filter the workspace to negative feedback
              </small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(() => {
                onClearSearch();
                onSelectFilter("all");
              })
            }
            type="button"
          >
            <span className="commandIcon">⌕</span>
            <span>
              <strong>Reset search and filters</strong>
              <small>Show all customer conversations</small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(onResetWorkspace)
            }
            type="button"
          >
            <span className="commandIcon">↺</span>
            <span>
              <strong>Reset demo workspace</strong>
              <small>
                Remove locally added feedback and restore sample data
              </small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
EOF

# ---------------------------------------------------------------------------
# 9. Dynamic metric card support
# ---------------------------------------------------------------------------
cat > components/dashboard/MetricCard.tsx <<'EOF'
import type { Metric } from "@/types/dashboard";

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metricCard">
      <div className="metricHeader">
        <span>{metric.label}</span>
      </div>

      <strong className="metricValue">
        {metric.value}
      </strong>

      <div className="metricFooter">
        <span
          className={`metricChange ${
            metric.trend === "down"
              ? "negative"
              : metric.trend === "neutral"
                ? "neutral"
                : ""
          }`}
        >
          {metric.change}
        </span>

        <span>{metric.description}</span>
      </div>
    </article>
  );
}
EOF

# ---------------------------------------------------------------------------
# 10. Main dashboard: local workspace + persistence + real views
# ---------------------------------------------------------------------------
cat > components/dashboard/DashboardClient.tsx <<'EOF'
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AnalysisResult } from "@/types/analysis";
import type {
  DashboardView,
  Feedback,
  NewFeedbackInput,
  Sentiment,
} from "@/types/dashboard";
import { feedbackItems } from "@/data/dashboard";
import {
  buildMetrics,
  buildSentimentSeries,
  getTopicBreakdown,
} from "@/lib/feedback";
import { AddFeedbackModal } from "@/components/dashboard/AddFeedbackModal";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { FeedbackDrawer } from "@/components/dashboard/FeedbackDrawer";
import { FeedbackItem } from "@/components/dashboard/FeedbackItem";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type Theme = "dark" | "light";
type FeedbackFilter = "all" | Sentiment;

const STORAGE_KEY = "signaldesk-feedback-workspace-v2";

const filters: Array<{
  label: string;
  value: FeedbackFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Positive", value: "positive" },
  { label: "Neutral", value: "neutral" },
  { label: "Negative", value: "negative" },
];

export function DashboardClient() {
  const [activeView, setActiveView] =
    useState<DashboardView>("overview");

  const [workspaceFeedback, setWorkspaceFeedback] =
    useState<Feedback[]>(feedbackItems);

  const [workspaceReady, setWorkspaceReady] =
    useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackFilter, setFeedbackFilter] =
    useState<FeedbackFilter>("all");

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] =
    useState(false);

  const [isAddFeedbackOpen, setIsAddFeedbackOpen] =
    useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [analysisError, setAnalysisError] =
    useState("");

  const analysisRequestRef =
    useRef<AbortController | null>(null);

  const [theme, setTheme] =
    useState<Theme>("dark");

  const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null);

  const [toastMessage, setToastMessage] =
    useState("");

  useEffect(() => {
    return () => {
      analysisRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(workspaceFeedback),
    );
  }, [workspaceFeedback, workspaceReady]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToastMessage("");
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    const handleKeyboardShortcut = (
      event: KeyboardEvent,
    ) => {
      const isCommandShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (isCommandShortcut) {
        event.preventDefault();
        setIsCommandPaletteOpen(
          (currentValue) => !currentValue,
        );
      }

      if (event.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsAddFeedbackOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut,
      );
    };
  }, []);

  const filteredFeedback = useMemo(() => {
    const normalizedQuery =
      searchQuery.trim().toLowerCase();

    return workspaceFeedback.filter(
      (feedback) => {
        const matchesFilter =
          feedbackFilter === "all" ||
          feedback.sentiment === feedbackFilter;

        const searchableContent = [
          feedback.customer,
          feedback.company,
          feedback.message,
          feedback.sentiment,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          normalizedQuery.length === 0 ||
          searchableContent.includes(
            normalizedQuery,
          );

        return matchesFilter && matchesSearch;
      },
    );
  }, [
    feedbackFilter,
    searchQuery,
    workspaceFeedback,
  ]);

  const metrics = useMemo(
    () => buildMetrics(workspaceFeedback),
    [workspaceFeedback],
  );

  const chartData = useMemo(
    () => buildSentimentSeries(workspaceFeedback),
    [workspaceFeedback],
  );

  const topics = useMemo(
    () => getTopicBreakdown(workspaceFeedback),
    [workspaceFeedback],
  );

  const handleAnalyzeFeedback = async () => {
    if (isAnalyzing) {
      return;
    }

    if (filteredFeedback.length === 0) {
      setAnalysisError(
        "There is no visible feedback available to analyse.",
      );
      setToastMessage(
        "Change the current search or filter.",
      );
      return;
    }

    analysisRequestRef.current?.abort();

    const controller = new AbortController();

    analysisRequestRef.current = controller;
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          feedback: filteredFeedback.map(
            (feedback) => ({
              message: feedback.message,
              sentiment: feedback.sentiment,
              score: feedback.score,
            }),
          ),
        }),
      });

      const result = (await response.json()) as
        | AnalysisResult
        | { message?: string };

      if (!response.ok) {
        const errorMessage =
          "message" in result
            ? result.message
            : "Analysis failed.";

        throw new Error(errorMessage);
      }

      setAnalysis(result as AnalysisResult);
      setToastMessage(
        "Evidence-based analysis refreshed.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Analysis failed. Please try again.",
      );
    } finally {
      if (
        analysisRequestRef.current === controller
      ) {
        analysisRequestRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const handleToggleTheme = () => {
    const nextTheme =
      theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    document.documentElement.dataset.theme =
      nextTheme;

    window.localStorage.setItem(
      "signaldesk-theme",
      nextTheme,
    );
  };

  const escapeCsvValue = (
    value: string | number,
  ) =>
    `"${String(value).replaceAll('"', '""')}"`;

  const handleExportFeedback = () => {
    if (filteredFeedback.length === 0) {
      setToastMessage(
        "There is no feedback to export.",
      );
      return;
    }

    const headings = [
      "Customer",
      "Company",
      "Message",
      "Sentiment",
      "Classification confidence",
      "Follow-up",
      "Created at",
    ];

    const rows = filteredFeedback.map(
      (feedback) => [
        feedback.customer,
        feedback.company,
        feedback.message,
        feedback.sentiment,
        feedback.score,
        feedback.followUp ? "Yes" : "No",
        feedback.createdAt,
      ],
    );

    const csvContent = [headings, ...rows]
      .map((row) =>
        row.map(escapeCsvValue).join(","),
      )
      .join("\n");

    const file = new Blob([csvContent], {
      type: "text/csv;charset=utf-8",
    });

    const downloadUrl =
      URL.createObjectURL(file);

    const link =
      document.createElement("a");

    link.href = downloadUrl;
    link.download = "signaldesk-feedback.csv";
    link.click();

    URL.revokeObjectURL(downloadUrl);

    setToastMessage(
      `${filteredFeedback.length} conversations exported.`,
    );
  };

  const handleAddFeedback = (
    input: NewFeedbackInput,
  ) => {
    const newFeedback: Feedback = {
      ...input,
      id:
        globalThis.crypto?.randomUUID?.() ??
        `feedback-${Date.now()}`,
      createdAt: "Just now",
      followUp:
        input.sentiment === "negative",
    };

    setWorkspaceFeedback((current) => [
      newFeedback,
      ...current,
    ]);

    setAnalysis(null);
    setActiveView("feedback");
    setSearchQuery("");
    setFeedbackFilter("all");
    setToastMessage(
      "Feedback added to the local workspace.",
    );
  };

  const handleToggleFollowUp = (
    feedbackId: string,
  ) => {
    setWorkspaceFeedback((current) =>
      current.map((feedback) =>
        feedback.id === feedbackId
          ? {
              ...feedback,
              followUp: !feedback.followUp,
            }
          : feedback,
      ),
    );

    setSelectedFeedback((current) =>
      current?.id === feedbackId
        ? {
            ...current,
            followUp: !current.followUp,
          }
        : current,
    );

    setToastMessage(
      "Follow-up status updated.",
    );
  };

  const handleResetWorkspace = () => {
    setWorkspaceFeedback(feedbackItems);
    setAnalysis(null);
    setSearchQuery("");
    setFeedbackFilter("all");
    setSelectedFeedback(null);
    setActiveView("overview");
    window.localStorage.removeItem(STORAGE_KEY);
    setToastMessage(
      "Demo workspace restored.",
    );
  };

  const visiblePreview =
    filteredFeedback.slice(0, 3);

  return (
    <>
      <main className="applicationShell">
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
        />

        <section className="dashboard">
          <Header
            activeView={activeView}
            onAddFeedback={() =>
              setIsAddFeedbackOpen(true)
            }
            onExport={handleExportFeedback}
            onOpenCommandPalette={() =>
              setIsCommandPaletteOpen(true)
            }
            onSearchChange={setSearchQuery}
            onToggleTheme={handleToggleTheme}
            searchQuery={searchQuery}
            theme={theme}
          />

          <div className="dashboardContent">
            {activeView === "overview" && (
              <>
                <section
                  aria-label="Dashboard metrics"
                  className="metricsGrid"
                >
                  {metrics.map((metric) => (
                    <MetricCard
                      key={metric.id}
                      metric={metric}
                    />
                  ))}
                </section>

                <section className="dashboardGrid">
                  <article className="panel sentimentPanel">
                    <div className="panelHeader">
                      <div>
                        <p className="eyebrow">
                          Sentiment overview
                        </p>
                        <h2>
                          Current workspace sentiment
                        </h2>
                      </div>

                      <span className="demoBadge">
                        {workspaceFeedback.length} conversations
                      </span>
                    </div>

                    <div className="sentimentSummary">
                      <div>
                        <strong>
                          {metrics[1]?.value ?? "0%"}
                        </strong>
                        <span>
                          Positive sentiment
                        </span>
                      </div>

                      <span className="positiveChange">
                        Live workspace
                      </span>
                    </div>

                    <div
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
                    </div>
                  </article>

                  <article className="panel insightPanel">
                    <div className="aiIcon">✦</div>

                    <div>
                      <p className="eyebrow">
                        Evidence-based insight
                      </p>
                      <h2>
                        {analysis?.title ??
                          "Run customer analysis"}
                      </h2>
                    </div>

                    <p>
                      {analysis?.summary ??
                        "Analyze the visible conversations to identify actual negative rates, recurring topics and supporting evidence."}
                    </p>

                    <div className="insightStats">
                      <div>
                        <span>Topic mentions</span>
                        <strong>
                          {analysis?.mentions ?? "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Priority</span>
                        <strong>
                          {analysis?.priority ?? "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Confidence</span>
                        <strong>
                          {analysis
                            ? `${analysis.confidence}%`
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    {analysis && (
                      <p
                        className="analysisSuccess"
                        role="status"
                      >
                        ✓ Derived from{" "}
                        {analysis.counts.total} visible
                        conversations
                      </p>
                    )}

                    {analysisError && (
                      <p
                        className="analysisError"
                        role="alert"
                      >
                        {analysisError}
                      </p>
                    )}

                    <button
                      className="primaryButton"
                      disabled={isAnalyzing}
                      onClick={handleAnalyzeFeedback}
                      type="button"
                    >
                      <span>
                        {isAnalyzing
                          ? "Analyzing feedback..."
                          : analysis
                            ? "Refresh analysis"
                            : "Run analysis"}
                      </span>

                      <span aria-hidden="true">
                        {isAnalyzing ? "…" : "→"}
                      </span>
                    </button>
                  </article>
                </section>

                <section className="panel feedbackPanel">
                  <div className="feedbackToolbar">
                    <div>
                      <p className="eyebrow">
                        Recent feedback
                      </p>
                      <h2>
                        Latest customer conversations
                      </h2>
                      <span className="resultCount">
                        Showing the latest{" "}
                        {visiblePreview.length}
                      </span>
                    </div>

                    <button
                      className="secondaryButton"
                      onClick={() =>
                        setActiveView("feedback")
                      }
                      type="button"
                    >
                      Open feedback workspace →
                    </button>
                  </div>

                  <div className="feedbackList">
                    {visiblePreview.map(
                      (feedback) => (
                        <FeedbackItem
                          feedback={feedback}
                          key={feedback.id}
                          onOpen={
                            setSelectedFeedback
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              </>
            )}

            {activeView === "feedback" && (
              <section
                className="panel feedbackPanel"
                id="live-feedback"
              >
                <div className="feedbackToolbar">
                  <div>
                    <p className="eyebrow">
                      Feedback workspace
                    </p>
                    <h2>
                      Customer conversations
                    </h2>
                    <span className="resultCount">
                      {filteredFeedback.length} of{" "}
                      {workspaceFeedback.length} conversations
                    </span>
                  </div>

                  <div className="feedbackToolbarActions">
                    <div
                      aria-label="Filter feedback by sentiment"
                      className="filterGroup"
                    >
                      {filters.map((filter) => (
                        <button
                          aria-pressed={
                            feedbackFilter ===
                            filter.value
                          }
                          className={
                            feedbackFilter ===
                            filter.value
                              ? "active"
                              : ""
                          }
                          key={filter.value}
                          onClick={() =>
                            setFeedbackFilter(
                              filter.value,
                            )
                          }
                          type="button"
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <button
                      className="primaryButton compactButton"
                      onClick={() =>
                        setIsAddFeedbackOpen(true)
                      }
                      type="button"
                    >
                      + Add feedback
                    </button>
                  </div>
                </div>

                {filteredFeedback.length > 0 ? (
                  <div className="feedbackList">
                    {filteredFeedback.map(
                      (feedback) => (
                        <FeedbackItem
                          feedback={feedback}
                          key={feedback.id}
                          onOpen={
                            setSelectedFeedback
                          }
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <div className="emptyState">
                    <span aria-hidden="true">
                      ⌕
                    </span>
                    <h3>No feedback found</h3>
                    <p>
                      Change the search text or
                      select another sentiment
                      filter.
                    </p>

                    <button
                      className="secondaryButton"
                      onClick={() => {
                        setSearchQuery("");
                        setFeedbackFilter("all");
                      }}
                      type="button"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </section>
            )}

            {activeView === "insights" && (
              <div className="insightsWorkspace">
                <section className="panel insightPanel insightPanelWide">
                  <div className="aiIcon">✦</div>

                  <div>
                    <p className="eyebrow">
                      Analysis
                    </p>
                    <h2>
                      {analysis?.title ??
                        "Generate evidence-based insight"}
                    </h2>
                  </div>

                  <p>
                    {analysis?.summary ??
                      "SignalDesk will summarize only what the currently visible feedback supports. No customer platform, time-of-day or volume claims are invented."}
                  </p>

                  <div className="insightStats">
                    <div>
                      <span>Visible records</span>
                      <strong>
                        {filteredFeedback.length}
                      </strong>
                    </div>

                    <div>
                      <span>Top topic</span>
                      <strong>
                        {analysis?.topTopic ?? "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Priority</span>
                      <strong>
                        {analysis?.priority ?? "—"}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="primaryButton"
                    disabled={isAnalyzing}
                    onClick={handleAnalyzeFeedback}
                    type="button"
                  >
                    {isAnalyzing
                      ? "Analyzing feedback..."
                      : analysis
                        ? "Refresh analysis"
                        : "Run analysis"}
                    <span aria-hidden="true">→</span>
                  </button>

                  {analysisError && (
                    <p
                      className="analysisError"
                      role="alert"
                    >
                      {analysisError}
                    </p>
                  )}

                  {analysis?.evidence.length ? (
                    <div className="evidenceList">
                      <p className="eyebrow">
                        Supporting evidence
                      </p>

                      {analysis.evidence.map(
                        (item, index) => (
                          <blockquote key={item}>
                            <span>
                              {String(
                                index + 1,
                              ).padStart(2, "0")}
                            </span>
                            <p>{item}</p>
                          </blockquote>
                        ),
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="panel topicPanel">
                  <div className="panelHeader">
                    <div>
                      <p className="eyebrow">
                        Topic detection
                      </p>
                      <h2>
                        Recurring themes
                      </h2>
                    </div>
                  </div>

                  {topics.length > 0 ? (
                    <div className="topicList">
                      {topics.map((topic) => (
                        <div key={topic.id}>
                          <span>
                            {topic.label}
                          </span>
                          <strong>
                            {topic.count}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyState compactEmpty">
                      <p>
                        Add more feedback to detect
                        recurring topics.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onAddFeedback={() =>
          setIsAddFeedbackOpen(true)
        }
        onClearSearch={() =>
          setSearchQuery("")
        }
        onClose={() =>
          setIsCommandPaletteOpen(false)
        }
        onNavigate={setActiveView}
        onResetWorkspace={
          handleResetWorkspace
        }
        onSelectFilter={
          setFeedbackFilter
        }
      />

      <AddFeedbackModal
        isOpen={isAddFeedbackOpen}
        onAdd={handleAddFeedback}
        onClose={() =>
          setIsAddFeedbackOpen(false)
        }
      />

      <FeedbackDrawer
        feedback={selectedFeedback}
        onClose={() =>
          setSelectedFeedback(null)
        }
        onToggleFollowUp={
          handleToggleFollowUp
        }
      />

      {toastMessage && (
        <div
          className="toastMessage"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          {toastMessage}
        </div>
      )}
    </>
  );
}
EOF

# ---------------------------------------------------------------------------
# 11. Accurate metadata
# ---------------------------------------------------------------------------
cat > app/layout.tsx <<'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalDesk — Customer Intelligence",
  description:
    "A customer-intelligence dashboard with searchable feedback, local workspace persistence, evidence-based analysis, sentiment classification and follow-up tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

# ---------------------------------------------------------------------------
# 12. CSS additions
# ---------------------------------------------------------------------------
python3 <<'PY'
from pathlib import Path

path = Path("app/globals.css")
text = path.read_text()
marker = "/* ===== SignalDesk meaningful workspace upgrade ===== */"

if marker in text:
    text = text.split(marker)[0].rstrip() + "\n"

path.write_text(text)
PY

cat >> app/globals.css <<'EOF'

/* ===== SignalDesk meaningful workspace upgrade ===== */

.headerAddButton {
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--accent);
  color: #07110b;
  font: inherit;
  font-size: .82rem;
  font-weight: 800;
  cursor: pointer;
}

.feedbackToolbarActions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.compactButton {
  min-height: 38px;
  width: auto;
  padding: 0 14px;
}

.followUpBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(250, 176, 65, .12);
  color: #eeb45b;
  font-size: .72rem;
  font-weight: 800;
}

.demoBadge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--surface-secondary);
  font-size: .75rem;
  font-weight: 700;
}

.metricChange.neutral {
  color: var(--text-secondary);
}

.modalOverlay {
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 7, 13, .7);
  backdrop-filter: blur(12px);
}

.feedbackComposer {
  width: min(620px, 100%);
  max-height: min(720px, calc(100vh - 48px));
  overflow: auto;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 28px 80px rgba(0, 0, 0, .34);
}

.feedbackComposer label {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: .78rem;
  font-weight: 700;
}

.feedbackComposer input,
.feedbackComposer textarea,
.feedbackComposer select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-secondary);
  color: var(--text-primary);
  padding: 12px 13px;
  font: inherit;
}

.feedbackComposer textarea {
  resize: vertical;
  line-height: 1.55;
}

.composerGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.classificationPreview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.classificationPreview > div,
.classificationPreview > label {
  min-height: 82px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-secondary);
}

.classificationPreview span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: .72rem;
}

.truthNote {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: .76rem;
  line-height: 1.6;
}

.insightsWorkspace {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .65fr);
  gap: 18px;
  align-items: start;
}

.insightPanelWide {
  min-height: 420px;
}

.evidenceList {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.evidenceList blockquote {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-secondary);
}

.evidenceList blockquote > span {
  color: #68737a;
  font-size: .72rem;
  font-weight: 800;
}

.evidenceList blockquote p {
  margin: 0;
  color: var(--text-secondary);
  font-size: .82rem;
  line-height: 1.55;
}

.topicPanel {
  min-height: 260px;
}

.topicList {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.topicList > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-secondary);
}

.topicList span {
  color: var(--text-secondary);
  font-size: .82rem;
}

.topicList strong {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--accent-dark);
  color: var(--accent);
  font-size: .78rem;
}

.compactEmpty {
  margin-top: 14px;
  min-height: 130px;
}

@media (max-width: 1100px) {
  .insightsWorkspace {
    grid-template-columns: 1fr;
  }

  .classificationPreview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .composerGrid {
    grid-template-columns: 1fr;
  }

  .feedbackToolbarActions {
    align-items: stretch;
    width: 100%;
  }

  .headerAddButton {
    width: 100%;
  }
}
EOF

# ---------------------------------------------------------------------------
# 13. Tests
# ---------------------------------------------------------------------------
cat > lib/feedback.test.ts <<'EOF'
import { describe, expect, it } from "vitest";

import {
  buildMetrics,
  classifyFeedback,
  getTopicBreakdown,
} from "./feedback";
import type { Feedback } from "@/types/dashboard";

describe("feedback intelligence", () => {
  it("classifies clearly positive and negative messages", () => {
    expect(
      classifyFeedback(
        "The new dashboard is fast and excellent.",
      ).sentiment,
    ).toBe("positive");

    expect(
      classifyFeedback(
        "Mobile notifications are slow and frustrating.",
      ).sentiment,
    ).toBe("negative");
  });

  it("derives metrics from actual workspace records", () => {
    const feedback: Feedback[] = [
      {
        id: "1",
        customer: "A",
        company: "A Co",
        message: "Great and fast",
        sentiment: "positive",
        score: 90,
        createdAt: "now",
      },
      {
        id: "2",
        customer: "B",
        company: "B Co",
        message: "Notifications are delayed",
        sentiment: "negative",
        score: 80,
        createdAt: "now",
        followUp: true,
      },
    ];

    const metrics = buildMetrics(feedback);

    expect(metrics[0]?.value).toBe("2");
    expect(metrics[1]?.value).toBe("50%");
    expect(metrics[3]?.value).toBe("1");
  });

  it("counts recurring topics from actual text", () => {
    const topics = getTopicBreakdown([
      { message: "Mobile notification delay" },
      { message: "Push notification problem" },
      { message: "Export is slow" },
    ]);

    expect(topics[0]).toMatchObject({
      id: "notifications",
      count: 2,
    });
  });
});
EOF

cat > lib/analyzeFeedback.test.ts <<'EOF'
import { describe, expect, it } from "vitest";

import { analyzeFeedback } from "./analyzeFeedback";

describe("analyzeFeedback", () => {
  it("uses real topic counts instead of fabricated mention totals", () => {
    const result = analyzeFeedback([
      {
        message:
          "Mobile notifications are delayed during testing.",
        sentiment: "negative",
        score: 82,
      },
      {
        message:
          "Push notifications are working much better now.",
        sentiment: "positive",
        score: 88,
      },
      {
        message:
          "Exporting the report still feels slow.",
        sentiment: "neutral",
        score: 70,
      },
    ]);

    expect(result.mentions).toBe(2);
    expect(result.topTopic).toBe("Notifications");
    expect(result.counts.total).toBe(3);
    expect(result.evidence).toHaveLength(2);
    expect(result.summary).toContain(
      "1 of 3 visible conversations are negative",
    );
  });

  it("does not invent platform claims", () => {
    const result = analyzeFeedback([
      {
        message: "The export takes too long.",
        sentiment: "negative",
        score: 78,
      },
    ]);

    expect(result.summary.toLowerCase()).not.toContain(
      "android",
    );
    expect(result.summary.toLowerCase()).not.toContain(
      "peak",
    );
  });
});
EOF

# ---------------------------------------------------------------------------
# 14. CI
# ---------------------------------------------------------------------------
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.13.0
          cache: npm

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
EOF

# ---------------------------------------------------------------------------
# 15. README
# ---------------------------------------------------------------------------
cat > README.md <<'EOF'
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
EOF

# ---------------------------------------------------------------------------
# 16. Package/test dependencies
# ---------------------------------------------------------------------------
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm install --save-dev 'vitest@^5.0.1'

# ---------------------------------------------------------------------------
# 17. Validate
# ---------------------------------------------------------------------------
echo "==> Running lint"
npm run lint

echo "==> Running tests"
npm test

echo "==> Running production build"
npm run build

echo
echo "============================================================"
echo "SignalDesk meaningful upgrade applied."
echo
echo "New real functionality:"
echo "  - Add Feedback"
echo "  - automatic local sentiment classification"
echo "  - browser workspace persistence"
echo "  - functional Overview / Feedback / Insights views"
echo "  - follow-up tracking"
echo "  - dynamic metrics and sentiment chart"
echo "  - topic detection"
echo "  - evidence-based server analysis"
echo "  - supporting evidence snippets"
echo "  - CSV export from the current view"
echo "  - tests + CI"
echo
echo "Review locally:"
echo "  npm run dev"
echo
echo "Then:"
echo "  git status"
echo "  git diff"
echo
echo "If satisfied:"
echo '  git add -A'
echo '  git commit -m "Upgrade SignalDesk with evidence-based customer intelligence"'
echo '  git push'
echo "============================================================"
