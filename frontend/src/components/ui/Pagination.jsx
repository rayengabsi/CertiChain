import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Build a compact page list: 1 … 4 5 6 … 20 */
function pageList(page, pages) {
  const out = [];
  const push = (n) => out.push(n);
  const window = 1;
  for (let n = 1; n <= pages; n += 1) {
    if (n === 1 || n === pages || (n >= page - window && n <= page + window)) push(n);
    else if (out[out.length - 1] !== '…') push('…');
  }
  return out;
}

/** Pagination — controlled pager with a result range summary. */
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="pages">
        <button
          type="button"
          className="page-btn"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        {pageList(page, pages).map((n, i) =>
          n === '…' ? (
            <span key={`gap-${i}`} className="dim" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className="page-btn"
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          className="page-btn"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
