// File: frontend/src/dashboard/components/ToastStack.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
type ToastTone = "success" | "error";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="dh-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`dh-toast dh-toast--${toast.tone}`} key={toast.id}>
          <p className="dh-toast__message">{toast.message}</p>
          <button className="dh-toast__dismiss" type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
            x
          </button>
        </div>
      ))}
    </div>
  );
}
