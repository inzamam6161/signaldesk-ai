import { NextResponse } from "next/server";

import { analyzeFeedback } from "@/lib/analyzeFeedback";
import type {
  AnalysisRequest,
  AnalysisFeedbackInput,
} from "@/types/analysis";

const validSentiments = new Set([
  "positive",
  "neutral",
  "negative",
]);

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
        (item): item is AnalysisFeedbackInput =>
          typeof item?.message === "string" &&
          item.message.trim().length > 0 &&
          typeof item.score === "number" &&
          Number.isFinite(item.score) &&
          typeof item.sentiment === "string" &&
          validSentiments.has(item.sentiment),
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

    return NextResponse.json(
      analyzeFeedback(validFeedback),
    );
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
