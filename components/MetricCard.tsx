import type { Metric } from "@/types/dashboard";
import { Icon } from "./Icon";

export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className="metric-card">
      <div className={`metric-card__icon metric-card__icon--${metric.tone}`}>
        <Icon name={metric.icon} />
      </div>
      <span className="metric-card__label">{metric.label}</span>
      <div className="metric-card__value">
        <strong>{metric.value}</strong>
        <span className={metric.change.startsWith("+") ? "up" : "down"}>
          {metric.change}
        </span>
      </div>
      <p>{metric.detail}</p>
    </article>
  );
}
