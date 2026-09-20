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
