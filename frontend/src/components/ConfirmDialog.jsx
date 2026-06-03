import Modal from "./Modal";

export default function ConfirmDialog({ title, message, onConfirm, onCancel,
  confirmLabel = "Bestätigen", confirmClass = "btn-danger" }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onCancel}>Abbrechen</button>
        <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
