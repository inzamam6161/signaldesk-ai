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
