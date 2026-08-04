import { NextResponse } from "next/server";

import type {
  AnalysisRequest,
  AnalysisResult,
} from "@/types/analysis";

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnalysisRequest>;

    if (!Array.isArray(body.feedback) || body.feedback.length === 0) {
      return NextResponse.json(
        {
          message: "At least one feedback record is required.",
        },
        {
          status: 400,
        },
      );
    }

    const validFeedback = body.feedback
      .filter(
        (item) =>
          typeof item.message === "string" &&
          item.message.trim().length > 0 &&
          typeof item.score === "number",
      )
      .slice(0, 100);

    if (validFeedback.length === 0) {
      return NextResponse.json(
        {
          message: "No valid feedback records were provided.",
        },
        {
          status: 400,
        },
      );
    }

    // Simulates processing time from an external AI provider.
    await wait(900);

    const negativeCount = validFeedback.filter(
      (item) => item.sentiment === "negative",
    ).length;

    const notificationMentions = validFeedback.filter((item) =>
      item.message.toLowerCase().includes("notification"),
    ).length;

    const negativePercentage =
      negativeCount / validFeedback.length;

    const priority: AnalysisResult["priority"] =
      negativePercentage >= 0.3
        ? "High"
        : negativePercentage >= 0.15
          ? "Medium"
          : "Low";

    const averageConfidence = Math.round(
      validFeedback.reduce(
        (total, feedback) => total + feedback.score,
        0,
      ) / validFeedback.length,
    );

    const hasNotificationIssue = notificationMentions > 0;

    const result: AnalysisResult = {
      title: hasNotificationIssue
        ? "Improve mobile notifications"
        : negativeCount > 0
          ? "Reduce customer friction"
          : "Maintain customer satisfaction",
      summary: hasNotificationIssue
        ? "The latest server analysis confirms that mobile notification delays remain the highest-impact issue. Android users are most affected during peak usage periods."
        : negativeCount > 0
          ? "Several conversations contain signs of customer friction. The support and product teams should review the negative feedback and create targeted follow-up actions."
          : "Customer sentiment remains healthy. Positive feedback is mainly connected to performance improvements and time saved through AI-assisted workflows.",
      mentions:
        230 +
        validFeedback.length * 7 +
        notificationMentions * 11,
      priority,
      confidence: Math.min(
        98,
        Math.max(75, averageConfidence),
      ),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        message: "The analysis request could not be processed.",
      },
      {
        status: 500,
      },
    );
  }
}