export type TrendDirection = "up" | "down";

export type Sentiment = "positive" | "neutral" | "negative";

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
}