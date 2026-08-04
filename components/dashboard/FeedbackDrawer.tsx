import { useEffect } from "react";

import type { Feedback } from "@/types/dashboard";

interface FeedbackDrawerProps {
  feedback: Feedback | null;
  onClose: () => void;
}

const recommendations = {
  positive: "Share this feedback with the product team and request a review.",
  neutral: "Create a follow-up task and investigate the reported friction.",
  negative: "Escalate this conversation to customer success immediately.",
};

export function FeedbackDrawer({
  feedback,
  onClose,
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
            <strong className={`drawerSentiment ${feedback.sentiment}`}>
              {feedback.sentiment}
            </strong>
          </div>

          <div>
            <span>AI confidence</span>
            <strong>{feedback.score}%</strong>
          </div>

          <div>
            <span>Received</span>
            <strong>{feedback.createdAt}</strong>
          </div>
        </section>

        <section className="drawerAiSummary">
          <div className="aiIcon">✦</div>

          <div>
            <span className="drawerLabel">AI recommendation</span>
            <p>{recommendations[feedback.sentiment]}</p>
          </div>
        </section>

        <div className="drawerActions">
          <button className="secondaryButton" type="button">
            Add to report
          </button>

          <button className="primaryButton" type="button">
            Create follow-up
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </div>
  );
}