// File: frontend/src/dashboard/components/PulseDots.tsx
// Purpose: Unified loading indicator used across all dashboard pages.
// Three dots that pulse in sequence. Use wherever data is loading.

type PulseDotsProps = {
  /** Container layout. "center" wraps in a centered block. "inline" renders inline. Default: "center" */
  layout?: "center" | "inline";
  /** Vertical padding for the centered block. Default: 40 */
  padding?: number;
  /** Optional accessible label */
  label?: string;
};

export function PulseDots({
  layout = "center",
  padding = 40,
  label = "Loading",
}: PulseDotsProps) {
  if (layout === "inline") {
    return (
      <span className="dh-pulse" role="status" aria-label={label}>
        <span className="dh-pulse__dot" />
        <span className="dh-pulse__dot" />
        <span className="dh-pulse__dot" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <div
      className="dh-pulse-center"
      style={{ padding: `${padding}px 0` }}
      role="status"
      aria-label={label}
    >
      <span className="dh-pulse">
        <span className="dh-pulse__dot" />
        <span className="dh-pulse__dot" />
        <span className="dh-pulse__dot" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
