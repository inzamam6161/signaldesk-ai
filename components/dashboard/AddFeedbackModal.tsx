import { useMemo, useState } from "react";

import { classifyFeedback } from "@/lib/feedback";
import type { NewFeedbackInput } from "@/types/dashboard";

interface AddFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (feedback: NewFeedbackInput) => void;
}

export function AddFeedbackModal({
  isOpen,
  onClose,
  onAdd,
}: AddFeedbackModalProps) {
  const [customer, setCustomer] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [manualSentiment, setManualSentiment] =
    useState<NewFeedbackInput["sentiment"] | "">("");

  const classification = useMemo(
    () => classifyFeedback(message),
    [message],
  );

  if (!isOpen) {
    return null;
  }

  const selectedSentiment =
    manualSentiment || classification.sentiment;

  const submit = () => {
    if (
      customer.trim().length < 2 ||
      company.trim().length < 2 ||
      message.trim().length < 8
    ) {
      return;
    }

    onAdd({
      customer: customer.trim(),
      company: company.trim(),
      message: message.trim(),
      sentiment: selectedSentiment,
      score:
        manualSentiment.length > 0
          ? Math.max(72, classification.score)
          : classification.score,
    });

    setCustomer("");
    setCompany("");
    setMessage("");
    setManualSentiment("");
    onClose();
  };

  return (
    <div
      className="modalOverlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-label="Add customer feedback"
        aria-modal="true"
        className="feedbackComposer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="drawerHeader">
          <div>
            <p className="eyebrow">Local workspace</p>
            <h2>Add customer feedback</h2>
          </div>

          <button
            aria-label="Close add feedback dialog"
            className="drawerCloseButton"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="composerGrid">
          <label>
            Customer
            <input
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="e.g. Maya Patel"
              value={customer}
            />
          </label>

          <label>
            Company
            <input
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Northstar Labs"
              value={company}
            />
          </label>
        </div>

        <label>
          Feedback
          <textarea
            onChange={(event) => {
              setMessage(event.target.value);
              setManualSentiment("");
            }}
            placeholder="Paste or type the customer message..."
            rows={5}
            value={message}
          />
        </label>

        <section className="classificationPreview">
          <div>
            <span>Automatic classification</span>
            <strong className={`drawerSentiment ${selectedSentiment}`}>
              {selectedSentiment}
            </strong>
          </div>

          <div>
            <span>Confidence</span>
            <strong>{classification.score}%</strong>
          </div>

          <label>
            Override
            <select
              onChange={(event) =>
                setManualSentiment(
                  event.target.value as
                    | NewFeedbackInput["sentiment"]
                    | "",
                )
              }
              value={manualSentiment}
            >
              <option value="">Use automatic</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>
        </section>

        <p className="truthNote">
          Classification runs locally with transparent keyword rules.
          You can override the result before saving.
        </p>

        <div className="drawerActions">
          <button
            className="secondaryButton"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="primaryButton"
            disabled={
              customer.trim().length < 2 ||
              company.trim().length < 2 ||
              message.trim().length < 8
            }
            onClick={submit}
            type="button"
          >
            Add to workspace
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
