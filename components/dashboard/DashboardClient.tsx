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
