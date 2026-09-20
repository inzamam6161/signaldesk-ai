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
