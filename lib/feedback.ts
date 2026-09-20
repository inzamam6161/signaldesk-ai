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
      label: "Avg. confidence",
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
