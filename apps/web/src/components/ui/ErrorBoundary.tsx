"use client";

import React from "react";

type BoundaryProps = {
  /** Human name shown in the fallback, e.g. "document list". */
  label: string;
  children: React.ReactNode;
};

type BoundaryState = { crashed: boolean };

/**
 * Isolates render failures: only the wrapped component shows an error,
 * the rest of the page keeps working. Resets when `key` changes
 * (pass the pathname for per-route reset).
 */
export default class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { crashed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    // Client-side log only — never ships PII; server logs stay clean.
    console.error(`[boundary:${this.props.label}]`, error);
  }

  private handleRetry = () => {
    this.setState({ crashed: false });
  };

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div
        className="paper-card p-6 text-center"
        role="alert"
        aria-label={`${this.props.label} failed to load`}
      >
        <p className="font-display text-xl font-bold">This {this.props.label} hit a snag</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Everything else on the page is fine. Give it another go.
        </p>
        <button
          className="btn-accent mt-4 px-5 py-2 text-sm font-semibold"
          onClick={this.handleRetry}
        >
          Try again
        </button>
      </div>
    );
  }
}
