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
