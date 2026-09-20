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
