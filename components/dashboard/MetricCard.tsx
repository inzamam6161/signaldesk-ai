import type { Metric } from "@/types/dashboard";

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metricCard">
      <div className="metricHeader">
        <span>{metric.label}</span>
        <button aria-label={`More options for ${metric.label}`} type="button">
          •••
        </button>
      </div>

      <strong className="metricValue">{metric.value}</strong>

      <div className="metricFooter">
        <span
          className={`metricChange ${
            metric.trend === "down" ? "negative" : ""
          }`}
        >
          {metric.change}
        </span>

        <span>{metric.description}</span>
      </div>
    </article>
  );
}