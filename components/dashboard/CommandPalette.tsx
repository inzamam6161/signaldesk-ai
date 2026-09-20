import type {
  DashboardView,
  Sentiment,
} from "@/types/dashboard";

type FeedbackFilter = "all" | Sentiment;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSearch: () => void;
  onSelectFilter: (filter: FeedbackFilter) => void;
  onNavigate: (view: DashboardView) => void;
  onAddFeedback: () => void;
  onResetWorkspace: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onClearSearch,
  onSelectFilter,
  onNavigate,
  onAddFeedback,
  onResetWorkspace,
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
                onNavigate("feedback");
                onAddFeedback();
              })
            }
            type="button"
          >
            <span className="commandIcon">＋</span>
            <span>
              <strong>Add customer feedback</strong>
              <small>
                Add and automatically classify a conversation
              </small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(() => onNavigate("insights"))
            }
            type="button"
          >
            <span className="commandIcon">✦</span>
            <span>
              <strong>Open insights</strong>
              <small>
                Review evidence-based customer themes
              </small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(() => {
                onNavigate("feedback");
                onClearSearch();
                onSelectFilter("negative");
              })
            }
            type="button"
          >
            <span className="commandIcon">!</span>
            <span>
              <strong>Show customer risks</strong>
              <small>
                Filter the workspace to negative feedback
              </small>
            </span>
          </button>

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
              <strong>Reset search and filters</strong>
              <small>Show all customer conversations</small>
            </span>
          </button>

          <button
            onClick={() =>
              runCommand(onResetWorkspace)
            }
            type="button"
          >
            <span className="commandIcon">↺</span>
            <span>
              <strong>Reset demo workspace</strong>
              <small>
                Remove locally added feedback and restore sample data
              </small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
