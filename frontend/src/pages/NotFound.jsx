import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container narrow center">
      <h1 className="page-title">404 — Page not found</h1>
      <p className="page-sub">That page does not exist.</p>
      <Link className="btn ghost" to="/">
        Back to verification
      </Link>
    </div>
  );
}
