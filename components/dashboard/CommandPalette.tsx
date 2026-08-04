import type { Sentiment } from "@/types/dashboard";

type FeedbackFilter = "all" | Sentiment;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSearch: () => void;
  onSelectFilter: (filter: FeedbackFilter) => void;
  onShowFeedback: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onClearSearch,
  onSelectFilter,
  onShowFeedback,
}: CommandPaletteProps) {
  if (!isOpen) {
    return null;
  }

  const runCommand = (command: () => void) => {
    command();
    onClose();
  };

  return (
    <div
      aria-label="Command palette"
      aria-modal="true"
      className="commandOverlay"
      onMouseDown={onClose}
      role="dialog"
    >
      <section
        className="commandPalette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="commandHeader">
          <div>
            <p className="eyebrow">Quick actions</p>
            <h2>Command palette</h2>
          </div>

          <button
            aria-label="Close command palette"
            className="commandCloseButton"
            onClick={onClose}
            type="button"
          >
            Esc
          </button>
        </div>

        <div className="commandList">
          <button
            onClick={() =>
              runCommand(() => {
                onClearSearch();
                onSelectFilter("all");
              })
            }
            type="button"
          >
            <span className="commandIcon">⌕</span>

            <span>
              <strong>Reset feedback search</strong>
              <small>Show all customer conversations</small>
            </span>
          </button>

          <button
            onClick={() => runCommand(() => onSelectFilter("positive"))}
            type="button"
          >
            <span className="commandIcon">↗</span>

            <span>
              <strong>Show positive feedback</strong>
              <small>Filter conversations by positive sentiment</small>
            </span>
          </button>

          <button
            onClick={() => runCommand(() => onSelectFilter("negative"))}
            type="button"
          >
            <span className="commandIcon">!</span>

            <span>
              <strong>Show customer risks</strong>
              <small>Display negative customer conversations</small>
            </span>
          </button>

          <button
            onClick={() => runCommand(onShowFeedback)}
            type="button"
          >
            <span className="commandIcon">↓</span>

            <span>
              <strong>Open live feedback</strong>
              <small>Jump to the customer feedback section</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}