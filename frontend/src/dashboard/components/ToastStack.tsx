// File: frontend/src/dashboard/components/ToastStack.tsx
// Purpose: Renders the dashboard toast stack with smooth enter/exit animations.

type ToastTone = "success" | "error";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastStackProps = {
  toasts: ToastItem[];
  exitingIds?: Set<number>;
  onDismiss: (id: number) => void;
};

export function ToastStack({ toasts, exitingIds, onDismiss }: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div className="dh-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const isExiting = exitingIds?.has(toast.id) ?? false;
        return (
          <div
            key={toast.id}
            className={`dh-toast dh-toast--${toast.tone}${isExiting ? " dh-toast--exiting" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <p className="dh-toast__message">{toast.message}</p>
            <button
              className="dh-toast__dismiss"
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
