import { useEffect } from "react";

import type { Feedback } from "@/types/dashboard";

interface FeedbackDrawerProps {
  feedback: Feedback | null;
  onClose: () => void;
  onToggleFollowUp: (feedbackId: string) => void;
}

const recommendations = {
  positive:
    "Share the positive signal with the product team and capture what is working.",
  neutral:
    "Review the reported friction and decide whether a product follow-up is needed.",
  negative:
    "Prioritize a follow-up and investigate the customer-reported issue.",
};

export function FeedbackDrawer({
  feedback,
  onClose,
  onToggleFollowUp,
}: FeedbackDrawerProps) {
  useEffect(() => {
    if (!feedback) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [feedback, onClose]);

  if (!feedback) {
    return null;
  }

  return (
    <div
      className="drawerOverlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <aside
        aria-label={`Feedback details for ${feedback.customer}`}
        aria-modal="true"
        className="feedbackDrawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="drawerHeader">
          <div>
            <p className="eyebrow">Customer conversation</p>
            <h2>Feedback details</h2>
          </div>

          <button
            aria-label="Close feedback details"
            className="drawerCloseButton"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <section className="drawerCustomer">
          <div className="drawerAvatar">
            {feedback.customer
              .split(" ")
              .map((name) => name[0])
              .join("")}
          </div>

          <div>
            <strong>{feedback.customer}</strong>
            <span>{feedback.company}</span>
          </div>
        </section>

        <section className="drawerSection">
          <span className="drawerLabel">Customer message</span>
          <p>{feedback.message}</p>
        </section>

        <section className="drawerStats">
          <div>
            <span>Sentiment</span>
            <strong
              className={`drawerSentiment ${feedback.sentiment}`}
            >
              {feedback.sentiment}
            </strong>
          </div>

          <div>
            <span>Classification confidence</span>
            <strong>{feedback.score}%</strong>
          </div>

          <div>
            <span>Received</span>
            <strong>{feedback.createdAt}</strong>
          </div>
        </section>

        <section className="drawerAiSummary">
          <div className="aiIcon">✓</div>

          <div>
            <span className="drawerLabel">Suggested action</span>
            <p>{recommendations[feedback.sentiment]}</p>
          </div>
        </section>

        <div className="drawerActions">
          <button
            className={
              feedback.followUp
                ? "primaryButton"
                : "secondaryButton"
            }
            onClick={() =>
              onToggleFollowUp(feedback.id)
            }
            type="button"
          >
            {feedback.followUp
              ? "✓ Follow-up tracked"
              : "Create follow-up"}
          </button>
        </div>
      </aside>
    </div>
  );
}
