"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AnalysisResult } from "@/types/analysis";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { FeedbackItem } from "@/components/dashboard/FeedbackItem";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { feedbackItems, metrics } from "@/data/dashboard";
import { FeedbackDrawer } from "@/components/dashboard/FeedbackDrawer";
import type { Feedback, Sentiment } from "@/types/dashboard";

type Theme = "dark" | "light";
type FeedbackFilter = "all" | Sentiment;
type ChartPeriod = "7" | "30" | "90";

const chartData: Record<ChartPeriod, number[]> = {
  "7": [46, 52, 61, 58, 72, 81, 86],
  "30": [32, 46, 40, 58, 53, 70, 64, 78, 72, 88, 81, 94],
  "90": [28, 34, 31, 42, 48, 45, 57, 61, 59, 68, 73, 78],
};

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
    const [searchQuery, setSearchQuery] = useState("");
    const [feedbackFilter, setFeedbackFilter] =
        useState<FeedbackFilter>("all");
    const [period, setPeriod] = useState<ChartPeriod>("30");
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] =
        useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const [analysisError, setAnalysisError] = useState("");

    const analysisRequestRef = useRef<AbortController | null>(null);
    const [theme, setTheme] = useState<Theme>("dark");
    const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null);
    const [toastMessage, setToastMessage] = useState("");


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
        document.documentElement.dataset.theme = initialTheme;
    }, []);

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
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const isCommandShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (isCommandShortcut) {
        event.preventDefault();
        setIsCommandPaletteOpen((currentValue) => !currentValue);
      }

      if (event.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, []);

  const filteredFeedback = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return feedbackItems.filter((feedback) => {
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
        searchableContent.includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [feedbackFilter, searchQuery]);

    const handleAnalyzeFeedback = async () => {
    if (isAnalyzing) {
        return;
    }

    if (filteredFeedback.length === 0) {
        setAnalysisError(
        "There is no visible feedback available to analyse.",
        );
        setToastMessage("Change the current search or filter.");
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
            feedback: filteredFeedback.map((feedback) => ({
            message: feedback.message,
            sentiment: feedback.sentiment,
            score: feedback.score,
            })),
        }),
        });

        const result = (await response.json()) as
        | AnalysisResult
        | { message?: string };

        if (!response.ok) {
        const errorMessage =
            "message" in result
            ? result.message
            : "AI analysis failed.";

        throw new Error(errorMessage);
        }

        setAnalysis(result as AnalysisResult);
        setToastMessage("AI analysis refreshed successfully.");
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
            : "AI analysis failed. Please try again.",
        );
    } finally {
        if (analysisRequestRef.current === controller) {
        analysisRequestRef.current = null;
        setIsAnalyzing(false);
        }
    }
    };

  const scrollToFeedback = () => {
    document
      .getElementById("live-feedback")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("signaldesk-theme", nextTheme);
    };

    const escapeCsvValue = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

    const handleExportFeedback = () => {
    if (filteredFeedback.length === 0) {
        setToastMessage("There is no feedback to export.");
        return;
    }

    const headings = [
        "Customer",
        "Company",
        "Message",
        "Sentiment",
        "AI confidence",
        "Created at",
    ];

    const rows = filteredFeedback.map((feedback) => [
        feedback.customer,
        feedback.company,
        feedback.message,
        feedback.sentiment,
        feedback.score,
        feedback.createdAt,
    ]);

    const csvContent = [headings, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");

    const file = new Blob([csvContent], {
        type: "text/csv;charset=utf-8",
    });

    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "signaldesk-feedback.csv";
    link.click();

    URL.revokeObjectURL(downloadUrl);
    setToastMessage(`${filteredFeedback.length} conversations exported.`);
    };

  return (
    <>
      <main className="applicationShell">
        <Sidebar />

        <section className="dashboard">
            <Header
                onExport={handleExportFeedback}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onSearchChange={setSearchQuery}
                onToggleTheme={handleToggleTheme}
                searchQuery={searchQuery}
                theme={theme}
            />

          <div className="dashboardContent">
            <section
              aria-label="Dashboard metrics"
              className="metricsGrid"
            >
              {metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </section>

            <section className="dashboardGrid">
              <article className="panel sentimentPanel">
                <div className="panelHeader">
                  <div>
                    <p className="eyebrow">Sentiment overview</p>
                    <h2>Customer confidence is increasing</h2>
                  </div>

                  <select
                    aria-label="Select reporting period"
                    onChange={(event) =>
                      setPeriod(event.target.value as ChartPeriod)
                    }
                    value={period}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>

                <div className="sentimentSummary">
                  <div>
                    <strong>84.2%</strong>
                    <span>Overall positive sentiment</span>
                  </div>

                  <span className="positiveChange">↗ 6.2%</span>
                </div>

                <div
                  aria-label={`Customer sentiment trend for the last ${period} days`}
                  className="chart"
                  role="img"
                >
                  {chartData[period].map((value, index) => (
                    <div
                      className="chartColumn"
                      key={`${period}-${value}-${index}`}
                    >
                      <div
                        className="chartBar"
                        style={{ height: `${value}%` }}
                        title={`${value}% positive sentiment`}
                      />
                    </div>
                  ))}
                </div>

                <div className="chartLabels">
                  <span>Start</span>
                  <span>Middle</span>
                  <span>Today</span>
                </div>
              </article>

              <article className="panel insightPanel">
                <div className="aiIcon">✦</div>

                <div>
                  <p className="eyebrow">AI recommendation</p>
                  <h2>Improve mobile notifications</h2>
                </div>

                    <p>
                    {analysis?.summary ??
                        "Notification delays appeared in 18% more conversations this week. Most reports came from Android users during peak hours."}
                    </p>
                    <div className="insightStats">
                    <div>
                        <span>Mentions</span>
                        <strong>{analysis?.mentions ?? 246}</strong>
                    </div>

                    <div>
                        <span>Priority</span>
                        <strong>{analysis?.priority ?? "High"}</strong>
                    </div>

                    <div>
                        <span>Confidence</span>
                        <strong>{analysis?.confidence ?? 92}%</strong>
                    </div>
                    </div>
                {analysis && !analysisError && (
                <p className="analysisSuccess" role="status">
                    ✓ Server analysis completed
                </p>
                )}

                {analysisError && (
                <p className="analysisError" role="alert">
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
                        ? "Refresh AI analysis"
                        : "Run AI analysis"}
                </span>

                <span aria-hidden="true">
                    {isAnalyzing ? "…" : "→"}
                </span>
                </button>
              </article>
            </section>

            <section
              className="panel feedbackPanel"
              id="live-feedback"
            >
              <div className="feedbackToolbar">
                <div>
                  <p className="eyebrow">Live feedback</p>
                  <h2>Recent customer conversations</h2>
                  <span className="resultCount">
                    {filteredFeedback.length} conversations found
                  </span>
                </div>

                <div
                  aria-label="Filter feedback by sentiment"
                  className="filterGroup"
                >
                  {filters.map((filter) => (
                    <button
                      aria-pressed={feedbackFilter === filter.value}
                      className={
                        feedbackFilter === filter.value ? "active" : ""
                      }
                      key={filter.value}
                      onClick={() =>
                        setFeedbackFilter(filter.value)
                      }
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredFeedback.length > 0 ? (
                <div className="feedbackList">
                  {filteredFeedback.map((feedback) => (
                    <FeedbackItem
                    feedback={feedback}
                    key={feedback.id}
                    onOpen={setSelectedFeedback}
                    />
                  ))}
                </div>
              ) : (
                <div className="emptyState">
                  <span aria-hidden="true">⌕</span>
                  <h3>No feedback found</h3>
                  <p>
                    Change the search text or select another sentiment
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
          </div>
        </section>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClearSearch={() => setSearchQuery("")}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectFilter={setFeedbackFilter}
        onShowFeedback={scrollToFeedback}
      />
      <FeedbackDrawer
            feedback={selectedFeedback}
            onClose={() => setSelectedFeedback(null)}
            />

            {toastMessage && (
            <div className="toastMessage" role="status">
                <span aria-hidden="true">✓</span>
                {toastMessage}
            </div>
        )}
    </>
  );
}