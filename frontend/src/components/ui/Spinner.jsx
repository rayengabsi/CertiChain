/** Inline loading spinner. */
export default function Spinner({ large = false }) {
  return <span className={`spinner${large ? ' lg' : ''}`} role="status" aria-label="Loading" />;
}
