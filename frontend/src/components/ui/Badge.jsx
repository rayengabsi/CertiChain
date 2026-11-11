/**
 * Badge — small status/label pill.
 * variant: neutral (default) | ok | warn | bad | brand | blue
 */
export default function Badge({ variant = 'neutral', dot = false, icon: Icon, children, className = '' }) {
  return (
    <span className={`badge ${variant} ${className}`.trim()}>
      {Icon ? <Icon size={12} strokeWidth={2.4} /> : dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}
