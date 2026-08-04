import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="routeState">
      <span className="routeStateIcon">404</span>

      <h1>Page not found</h1>

      <p>
        The SignalDesk page you requested does not exist or may have
        moved.
      </p>

      <Link className="primaryButton routeStateButton" href="/">
        Return to dashboard
        <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}