const navigationItems = [
  { label: "Overview", icon: "⌂", active: true },
  { label: "AI Insights", icon: "✦", active: false },
  { label: "Feedback", icon: "◫", active: false },
  { label: "Automations", icon: "⌁", active: false },
  { label: "Reports", icon: "▥", active: false },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">S</div>

        <div>
          <strong>SignalDesk</strong>
          <span>AI Intelligence</span>
        </div>
      </div>

      <nav className="sidebarNavigation" aria-label="Main navigation">
        <p className="navigationLabel">Workspace</p>

        {navigationItems.map((item) => (
          <button
            className={`navigationItem ${item.active ? "active" : ""}`}
            key={item.label}
            type="button"
          >
            <span className="navigationIcon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="workspaceCard">
          <span className="statusDot" />

          <div>
            <strong>AI engine online</strong>
            <span>All systems operational</span>
          </div>
        </div>

        <button className="navigationItem" type="button">
          <span className="navigationIcon" aria-hidden="true">
            ⚙
          </span>

          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}