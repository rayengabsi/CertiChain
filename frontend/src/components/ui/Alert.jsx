import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';

const ICONS = { error: XCircle, ok: CheckCircle2, info: Info, warn: TriangleAlert };

/** Alert — inline message block. variant: info | ok | warn | error */
export default function Alert({ variant = 'info', title, children, action, className = '' }) {
  const Icon = ICONS[variant] || Info;
  return (
    <div className={`alert ${variant} ${className}`.trim()} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon size={17} strokeWidth={2.2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <strong>{title}</strong> : null}
        {title && children ? <div style={{ marginTop: 2 }}>{children}</div> : children}
      </div>
      {action ? <div className="row tight">{action}</div> : null}
    </div>
  );
}
