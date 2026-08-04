interface HeaderProps {
  searchQuery: string;
  theme: "dark" | "light";
  onSearchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
}

export function Header({
  searchQuery,
  theme,
  onSearchChange,
  onOpenCommandPalette,
  onToggleTheme,
  onExport,
}: HeaderProps) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">AI customer intelligence</p>
        <h1>Good morning, Inzamamul</h1>
        <p className="headerDescription">
          Here is what your customers are saying today.
        </p>
      </div>

      <div className="headerActions">
        <label className="searchBox">
          <span aria-hidden="true">⌕</span>

          <input
            aria-label="Search customer feedback"
            onChange={(event) => onSearchChange(event.target.value)}
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

        <button className="profileButton" type="button">
          <span className="profileAvatar">IH</span>

          <span className="profileDetails">
            <strong>Inzamamul</strong>
            <small>Administrator</small>
          </span>

          <span aria-hidden="true">⌄</span>
        </button>
      </div>
    </header>
  );
}