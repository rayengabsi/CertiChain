/** Shimmer placeholder used while data is loading. */
export default function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

/** A stack of text-line placeholders. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`stack ${className}`.trim()} aria-hidden="true" style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="text" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

/** Table-shaped placeholder (rows × cols). */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="stack" aria-hidden="true" style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="text" style={{ flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
