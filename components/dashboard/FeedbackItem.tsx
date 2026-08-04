import type { Feedback } from "@/types/dashboard";

interface FeedbackItemProps {
  feedback: Feedback;
  onOpen: (feedback: Feedback) => void;
}

const sentimentLabels = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function FeedbackItem({
  feedback,
  onOpen,
}: FeedbackItemProps) {
  const initials = feedback.customer
    .split(" ")
    .map((name) => name[0])
    .join("");

  return (
    <article className="feedbackItem">
      <div className="customerAvatar">{initials}</div>

      <div className="feedbackContent">
        <div className="feedbackHeader">
          <div>
            <strong>{feedback.customer}</strong>
            <span>{feedback.company}</span>
          </div>

          <time>{feedback.createdAt}</time>
        </div>

        <p>{feedback.message}</p>

        <div className="feedbackMetadata">
          <span className={`sentimentBadge ${feedback.sentiment}`}>
            {sentimentLabels[feedback.sentiment]}
          </span>

          <span>AI confidence: {feedback.score}%</span>
        </div>
      </div>

      <button
        aria-label={`Open feedback from ${feedback.customer}`}
        className="feedbackAction"
        onClick={() => onOpen(feedback)}
        type="button"
      >
        →
      </button>
    </article>
  );
}