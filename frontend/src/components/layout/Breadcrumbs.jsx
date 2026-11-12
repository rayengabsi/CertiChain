import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Breadcrumbs — items: [{ label, to? }] (the last item is rendered as plain text). */
export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <Fragment key={`${it.label}-${i}`}>
          {i > 0 ? <ChevronRight size={13} className="sep" aria-hidden="true" /> : null}
          {it.to && i < items.length - 1 ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
