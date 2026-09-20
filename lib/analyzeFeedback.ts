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
