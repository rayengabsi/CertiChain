/** Card surface + a matching header row. */
export default function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, sub, actions }) {
  return (
    <div className="card-head">
      <div>
        {title ? <h3>{title}</h3> : null}
        {sub ? <p className="card-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="row tight">{actions}</div> : null}
    </div>
  );
}
