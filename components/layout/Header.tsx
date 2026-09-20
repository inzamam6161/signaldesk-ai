import type { DashboardView } from "@/types/dashboard";

interface HeaderProps {
  activeView: DashboardView;
  searchQuery: string;
  theme: "dark" | "light";
  onSearchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onAddFeedback: () => void;
}

const viewCopy: Record<
  DashboardView,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Customer intelligence",
    title: "Customer overview",
    description:
      "Understand sentiment, risks and recurring themes from the current workspace.",
  },
  feedback: {
    eyebrow: "Feedback workspace",
    title: "Customer conversations",
    description:
      "Search, filter, add and track customer feedback in one place.",
  },
  insights: {
    eyebrow: "Evidence-based insights",
    title: "What needs attention",
    description:
      "Generate transparent analysis from the conversations currently in view.",
  },
};

export function Header({
  activeView,
  searchQuery,
  theme,
  onSearchChange,
  onOpenCommandPalette,
  onToggleTheme,
  onExport,
  onAddFeedback,
}: HeaderProps) {
  const copy = viewCopy[activeView];

  return (
    <header className="header">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="headerDescription">
          {copy.description}
        </p>
      </div>

      <div className="headerActions">
        <label className="searchBox">
          <span aria-hidden="true">⌕</span>

          <input
            aria-label="Search customer feedback"
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search feedback..."
            type="search"
            value={searchQuery}
          />

          <button
            aria-label="Open command palette"
            className="keyboardShortcut"
            onClick={onOpenCommandPalette}
            type="button"
          >
            ⌘ K
          </button>
        </label>

        <button
          className="headerAddButton"
          onClick={onAddFeedback}
          type="button"
        >
          + Add feedback
        </button>

        <button
          aria-label="Export filtered feedback"
          className="iconButton"
          onClick={onExport}
          title="Export feedback"
          type="button"
        >
          ⇩
        </button>

        <button
          aria-label={`Switch to ${
            theme === "dark" ? "light" : "dark"
          } theme`}
          className="iconButton"
          onClick={onToggleTheme}
          title="Change theme"
          type="button"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>

        <div className="profileButton" aria-label="Demo workspace">
          <span className="profileAvatar">DW</span>

          <span className="profileDetails">
            <strong>Demo Workspace</strong>
            <small>Product Team</small>
          </span>
        </div>
      </div>
    </header>
  );
}
