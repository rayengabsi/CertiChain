import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal — accessible dialog rendered in a portal.
 * Closes on Escape and on backdrop click; locks background scroll; focuses on open.
 */
export default function Modal({ open, onClose, title, subtitle, icon: Icon, iconVariant = '', size = '', children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${size}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modal-head">
          {Icon ? (
            <span className={`modal-ico ${iconVariant}`.trim()}>
              <Icon size={20} strokeWidth={2.2} />
            </span>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="modal-sub">{subtitle}</div> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog" type="button">
            <X size={18} />
          </button>
        </div>
        {children ? <div className="modal-body">{children}</div> : null}
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
