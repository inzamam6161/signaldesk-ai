import type { Feedback, Metric } from "@/types/dashboard";

export const metrics: Metric[] = [
  {
    id: "feedback",
    label: "Feedback analysed",
    value: "12,840",
    change: "+18.4%",
    trend: "up",
    description: "Compared with last month",
  },
  {
    id: "sentiment",
    label: "Positive sentiment",
    value: "84.2%",
    change: "+6.2%",
    trend: "up",
    description: "Across all channels",
  },
  {
    id: "response",
    label: "Average response",
    value: "1.8h",
    change: "-24 min",
    trend: "up",
    description: "AI-assisted response time",
  },
  {
    id: "risk",
    label: "Customers at risk",
    value: "126",
    change: "+12",
    trend: "down",
    description: "Require immediate attention",
  },
];

export const feedbackItems: Feedback[] = [
  {
    id: "feedback-1",
    customer: "Sarah Mitchell",
    company: "Northstar Labs",
    message:
      "The new analytics dashboard is much faster, but exporting larger reports still takes too long.",
    sentiment: "neutral",
    score: 68,
    createdAt: "8 minutes ago",
  },
  {
    id: "feedback-2",
    customer: "Omar Hassan",
    company: "Vertex Digital",
    message:
      "The AI summary saved our support team several hours this week. Excellent improvement.",
    sentiment: "positive",
    score: 94,
    createdAt: "22 minutes ago",
  },
  {
    id: "feedback-3",
    customer: "Emma Thompson",
    company: "Coreline Systems",
    message:
      "We are still experiencing notification delays on mobile devices during peak hours.",
    sentiment: "negative",
    score: 31,
    createdAt: "47 minutes ago",
  },
];