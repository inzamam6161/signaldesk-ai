import type { Metric } from "@/types/dashboard";

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metricCard">
      <div className="metricHeader">
        <span>{metric.label}</span>
      </div>

      <strong className="metricValue">
        {metric.value}
      </strong>

      <div className="metricFooter">
        <span
          className={`metricChange ${
            metric.trend === "down"
              ? "negative"
              : metric.trend === "neutral"
                ? "neutral"
                : ""
          }`}
        >
          {metric.change}
        </span>

        <span>{metric.description}</span>
      </div>
    </article>
  );
}
