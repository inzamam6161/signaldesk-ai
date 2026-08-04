"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("SignalDesk route error:", error);
  }, [error]);

  return (
    <main className="routeState">
      <span className="routeStateIcon">!</span>

      <h1>Something went wrong</h1>

      <p>
        SignalDesk could not load this screen. Your saved theme and
        browser data remain unchanged.
      </p>

      <button className="primaryButton routeStateButton" onClick={reset}>
        Try again
        <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}