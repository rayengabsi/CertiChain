import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * ConfirmDialog — professional confirmation before a sensitive action.
 * Used for on-chain authorizations, deauthorizations and revocations.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  icon,
  iconVariant = '',
  busy = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      subtitle={description}
      icon={icon}
      iconVariant={iconVariant}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
