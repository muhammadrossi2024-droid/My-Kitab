// Small reusable confirm/cancel modal, styled to match the app's existing
// popover pattern (see .ayah-picker-backdrop/.ayah-picker-popover in
// index.css) — used wherever an action needs a deliberate second tap before
// it happens (currently: deleting a PDF from My Library).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="confirm-dialog-title">{title}</div>
        {message && <p className="confirm-dialog-message">{message}</p>}
        <div className="confirm-dialog-actions">
          <button className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={"btn" + (danger ? " btn-danger" : " btn-primary")} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
