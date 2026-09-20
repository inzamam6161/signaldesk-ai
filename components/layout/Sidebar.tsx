import type { DashboardView } from "@/types/dashboard";

const navigationItems: Array<{
  id: DashboardView;
  label: string;
  icon: string;
}> = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "feedback", label: "Feedback", icon: "◫" },
  { id: "insights", label: "Insights", icon: "✦" },
];

interface SidebarProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function Sidebar({
  activeView,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">S</div>

        <div>
          <strong>SignalDesk</strong>
          <span>Customer Intelligence</span>
        </div>
      </div>

      <nav className="sidebarNavigation" aria-label="Main navigation">
        <p className="navigationLabel">Workspace</p>

        {navigationItems.map((item) => (
          <button
            aria-current={
              activeView === item.id ? "page" : undefined
            }
            className={`navigationItem ${
              activeView === item.id ? "active" : ""
            }`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
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
            <strong>Analysis engine ready</strong>
            <span>Evidence-based demo processing</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
