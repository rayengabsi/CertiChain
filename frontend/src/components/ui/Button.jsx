/**
 * Button — one component for every action style in the app.
 * variant: primary (default) | ghost | subtle | danger | success | blue
 * size:    md (default) | small | large
 */
export default function Button({
  variant = 'primary',
  size,
  block = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    variant !== 'primary' ? variant : '',
    size || '',
    block ? 'block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type={type} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" /> : Icon ? <Icon size={16} strokeWidth={2.2} /> : null}
      {children}
      {IconRight ? <IconRight size={16} strokeWidth={2.2} /> : null}
    </button>
  );
}
