// File: frontend/src/dashboard/components/ConfirmActionModal.tsx
// Purpose: Renders a reusable dashboard confirmation modal for risky admin actions.

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  confirmTone = "primary",
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card--narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3 className="modal-title" id="confirm-action-title">{title}</h3>
        </header>
        <p className="post-details__line" style={{ whiteSpace: "pre-wrap" }}>{message}</p>
        <div className="modal-actions">
          <button className="btn btn--secondary" type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={confirmTone === "danger" ? "btn btn--danger" : "btn btn--primary"}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
