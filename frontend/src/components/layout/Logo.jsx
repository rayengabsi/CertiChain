import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

/** Brand lockup: the CertiChain mark plus optional wordmark. */
export default function Logo({ to = '/', withText = true, subtitle = 'Blockchain credentials' }) {
  const inner = (
    <>
      <span className="brand-mark">
        <ShieldCheck size={19} strokeWidth={2.4} />
      </span>
      {withText ? (
        <span className="brand-name">
          CertiChain
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
      ) : null}
    </>
  );

  const style = { display: 'flex', alignItems: 'center', gap: 11, color: 'inherit' };

  return to ? (
    <Link to={to} style={style} aria-label="CertiChain home">
      {inner}
    </Link>
  ) : (
    <span style={style}>{inner}</span>
  );
}
